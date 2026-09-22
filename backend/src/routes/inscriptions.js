const express = require('express');
const Inscription = require('../models/Inscription');
const Creneau = require('../models/Creneau');
const { envoyerEmailsValidation } = require('../utils/validationService');
const { isEmailPersonnelAutorise, DOMAINES_PERSONNEL_AUTORISES } = require('../utils/validators');
const { CHAMPS_EXPORT, genererClasseurInscriptions } = require('../utils/exportExcel');
const { getParametre, getParametresPourType } = require('../utils/parametres');
const { debutJournee, ajouterJours, debutSemaine, finSemaine, jourSemaine, creneauDansPlage } = require('../utils/dateUtils');
const { sendNouvelleInscriptionResponsableEmail, sendReReserverEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');
const { restreindreInscriptionsParRole } = require('../middleware/role');

const router = express.Router();

// Statuts qui "consomment" une place / comptent dans le quota hebdomadaire.
const STATUTS_OCCUPANTS = ['en_attente', 'confirme'];

// Statuts vers lesquels une inscription CONFIRMÉE peut encore basculer.
// Règle : une fois confirmée, impossible de revenir à "en_attente" directement.
const TRANSITIONS_DEPUIS_CONFIRME = ['re_reserve', 'annule', 'confirme'];

// Récupère l'adresse IP réelle du visiteur (en tenant compte d'un éventuel proxy/load-balancer)
const getIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

// Envoie (au mieux, sans jamais faire échouer l'appelant) le mail de notification
// au(x) responsable(s) configuré(s) pour le type concerné, quand une nouvelle
// inscription arrive et attend confirmation.
const notifierResponsablesNouvelleInscription = async (inscription, creneau) => {
  try {
    const cle = inscription.typeInscrit === 'client' ? 'emailsResponsableClient' : 'emailsResponsablePersonnel';
    const emails = await getParametre(cle);
    for (const to of emails || []) {
      await sendNouvelleInscriptionResponsableEmail({
        to,
        nomComplet: inscription.nomComplet,
        typeInscrit: inscription.typeInscrit,
        creneau,
        date: inscription.date,
        societe: inscription.societe,
      });
    }
  } catch (err) {
    console.error('Erreur envoi mail responsable (nouvelle inscription):', err.message);
  }
};

// POST /api/inscriptions — publique, s'inscrire à un créneau (date + horaire) avec son équipe de 4 joueurs
router.post('/', async (req, res) => {
  try {
    const { nomComplet, telephone, email, creneauId, typeInscrit, invites, societe, date } = req.body;

    // Validation de base
    if (!nomComplet || !telephone || !email || !creneauId || !typeInscrit || !date) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }

    // La société est obligatoire pour les clients
    if (typeInscrit === 'client' && !societe?.trim()) {
      return res.status(400).json({ message: "Le nom de la société est requis" });
    }

    // Le padel se joue en équipe de 4 : le participant principal + 3 autres joueurs.
    // Le nom complet de chaque invité est obligatoire, mais son email est désormais optionnel.
    if (
      !Array.isArray(invites) ||
      invites.length !== 3 ||
      invites.some((i) => !i?.nom?.trim())
    ) {
      return res.status(400).json({
        message: "Une équipe de padel compte 4 joueurs : merci de renseigner au moins le nom complet des 3 autres membres de votre équipe.",
      });
    }

    // Si un invité a rempli un email, on vérifie qu'il est syntaxiquement valide
    const emailInviteInvalide = invites.find(
      (i) => i.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())
    );
    if (emailInviteInvalide) {
      return res.status(400).json({ message: `L'adresse "${emailInviteInvalide.email}" n'est pas valide.` });
    }

    // Pour le personnel, le mail du participant doit utiliser un domaine autorisé,
    // ainsi que celui de chaque invité qui en a renseigné un.
    if (typeInscrit === 'personnel') {
      const emailsAVerifier = [email, ...invites.map((i) => i.email).filter(Boolean)];
      const emailInvalide = emailsAVerifier.find((e) => !isEmailPersonnelAutorise(e));
      if (emailInvalide) {
        return res.status(400).json({
          message: `L'adresse "${emailInvalide}" n'est pas autorisée pour le personnel. Les emails doivent se terminer par ${DOMAINES_PERSONNEL_AUTORISES.map((d) => `@${d}`).join(' ou ')}.`,
        });
      }
    }

    // ======================================================
    // Validation de la date choisie : doit respecter le délai minimum (par défaut 7 jours)
    // et rester dans la fenêtre du calendrier (par défaut 15 jours), tous deux configurables.
    // ======================================================
    const dateChoisie = debutJournee(date);
    if (Number.isNaN(dateChoisie.getTime())) {
      return res.status(400).json({ message: 'Date invalide' });
    }

    const { delaiMinJours, joursCalendrierVisibles, joursOuverts, heureOuverture, heureFermeture } =
      await getParametresPourType(typeInscrit);
    const dateMin = ajouterJours(new Date(), delaiMinJours);
    const dateMax = ajouterJours(new Date(), joursCalendrierVisibles);

    if (dateChoisie < dateMin) {
      return res.status(400).json({
        message: `Cette date est trop proche : la réservation n'est possible qu'à partir de ${delaiMinJours} jour(s) à l'avance.`,
      });
    }
    if (dateChoisie > dateMax) {
      return res.status(400).json({
        message: `Cette date n'est pas encore ouverte à la réservation (fenêtre actuelle : ${joursCalendrierVisibles} jours).`,
      });
    }
    if (!joursOuverts.includes(jourSemaine(dateChoisie))) {
      return res.status(400).json({ message: "La réservation n'est pas ouverte ce jour-là. Merci de choisir une autre date." });
    }

    // Vérifier que le créneau (gabarit horaire) existe et est actif
    const creneau = await Creneau.findById(creneauId);
    if (!creneau || !creneau.actif) {
      return res.status(404).json({ message: 'Créneau introuvable ou inactif' });
    }

    // Vérifier compatibilité type (client/personnel)
    if (creneau.type !== 'mixte' && creneau.type !== typeInscrit) {
      return res.status(400).json({
        message: `Ce créneau est réservé aux ${creneau.type}s`,
      });
    }

    // Vérifier que le créneau reste dans la plage horaire globale configurée pour ce type
    if (!creneauDansPlage(creneau.heureDebut, creneau.heureFin, heureOuverture, heureFermeture)) {
      return res.status(400).json({ message: 'Ce créneau est en dehors des horaires de réservation.' });
    }

    // ======================================================
    // Vérifier les places restantes pour CE créneau à CETTE date précise
    // ======================================================
    const lendemain = ajouterJours(dateChoisie, 1);
    const reservesCeJour = await Inscription.countDocuments({
      creneau: creneauId,
      date: { $gte: dateChoisie, $lt: lendemain },
      statut: { $in: STATUTS_OCCUPANTS },
    });
    if (reservesCeJour >= creneau.nombrePlaces) {
      return res.status(400).json({ message: 'Ce créneau est complet pour cette date' });
    }

    // ======================================================
    // Vérifier le quota hebdomadaire (par type, configurable dans le dashboard)
    // ======================================================
    const cleLimite = typeInscrit === 'client' ? 'limiteHebdomadaireClient' : 'limiteHebdomadairePersonnel';
    const limiteHebdo = await getParametre(cleLimite);
    const debutSem = debutSemaine(dateChoisie);
    const finSem = finSemaine(dateChoisie);
    const reservationsSemaine = await Inscription.countDocuments({
      typeInscrit,
      date: { $gte: debutSem, $lte: finSem },
      statut: { $in: STATUTS_OCCUPANTS },
    });
    if (reservationsSemaine >= limiteHebdo) {
      return res.status(400).json({
        message: `La limite de ${limiteHebdo} réservation(s) par semaine pour les ${typeInscrit}s est atteinte pour cette semaine. Merci de choisir une autre semaine.`,
        quotaAtteint: true,
      });
    }

    const ipAddress = getIp(req);

    // Créer l'inscription
    const inscription = await Inscription.create({
      typeInscrit,
      nomComplet: nomComplet.trim(),
      telephone,
      email: email.toLowerCase(),
      societe: typeInscrit === 'client' ? societe.trim() : undefined,
      invites: invites.map((i) => ({
        nom: i.nom.trim(),
        email: i.email?.trim() ? i.email.toLowerCase().trim() : '',
      })),
      creneau: creneauId,
      date: dateChoisie,
      ipAddress,
      // Une entrée de satisfaction par personne ayant un email (participant + invités qui en ont fourni un)
      satisfaction: [
        { role: 'participant', nom: nomComplet.trim(), email: email.toLowerCase() },
        ...invites
          .filter((i) => i.email?.trim())
          .map((i) => ({ role: 'invite', nom: i.nom.trim(), email: i.email.toLowerCase().trim() })),
      ],
    });

    // On notifie le(s) responsable(s) du type concerné qu'une inscription attend leur
    // confirmation (best-effort : une erreur d'envoi ne doit pas faire échouer l'inscription).
    notifierResponsablesNouvelleInscription(inscription, creneau);

    res.status(201).json({
      message: 'Inscription réussie ! Elle est en attente de validation par notre équipe.',
      inscriptionId: inscription._id,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/inscriptions — admin, liste les inscriptions (filtrées automatiquement selon le rôle)
router.get('/', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const { statut, typeInscrit, creneauId } = req.query;
    const filter = { ...req.filtreRole };

    if (statut) filter.statut = statut;
    // Si l'admin est restreint à un type, on ignore tout typeInscrit différent dans la query
    if (typeInscrit && !req.filtreRole.typeInscrit) filter.typeInscrit = typeInscrit;
    if (creneauId) filter.creneau = creneauId;

    const inscriptions = await Inscription.find(filter)
      .populate('creneau')
      .sort({ createdAt: -1 });

    res.json(inscriptions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Vérifie qu'une transition de statut est autorisée. Règle : une fois confirmée, une
// inscription ne peut plus repasser "en attente" — seulement "re_reserve" ou "annule".
function transitionAutorisee(statutActuel, statutVoulu) {
  if (statutActuel === 'confirme' && !TRANSITIONS_DEPUIS_CONFIRME.includes(statutVoulu)) {
    return false;
  }
  return true;
}

// Applique le nouveau statut à une inscription déjà chargée (avec creneau populé),
// en envoyant les emails associés le cas échéant. Renvoie les éventuelles erreurs d'envoi.
async function appliquerStatut(inscription, statut) {
  const erreursEmail = [];

  if (statut === 'confirme') {
    const resultat = await envoyerEmailsValidation(inscription, inscription.creneau);
    erreursEmail.push(...resultat.erreurs);
  }

  if (statut === 're_reserve') {
    inscription.dateReReservation = new Date();
    try {
      await sendReReserverEmail({
        to: inscription.email,
        nomComplet: inscription.nomComplet,
        creneau: inscription.creneau,
        date: inscription.date,
        tokenGestion: inscription.tokenGestion,
      });
    } catch (err) {
      erreursEmail.push({ email: inscription.email, erreur: err.message });
    }
  }

  if (statut === 'annule') {
    inscription.dateAnnulation = new Date();
    inscription.annulePar = 'admin';
  }

  inscription.statut = statut;
  await inscription.save();
  return erreursEmail;
}

// PATCH /api/inscriptions/:id/statut — admin, changer le statut d'une inscription
// Si le nouveau statut est "confirme", envoie automatiquement le mail de validation
// (avec détails du créneau + Wi-Fi) au participant et à ses invités ayant un email.
// Si le nouveau statut est "re_reserve", envoie un mail au participant pour qu'il
// choisisse un nouveau créneau (ses données ne sont pas perdues).
router.patch('/:id/statut', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const { statut } = req.body;
    if (!['en_attente', 'confirme', 're_reserve', 'annule'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const inscription = await Inscription.findById(req.params.id).populate('creneau');
    if (!inscription) return res.status(404).json({ message: 'Inscription introuvable' });

    // Un admin restreint (Clients ou Personnel) ne peut agir que sur son périmètre
    if (req.filtreRole.typeInscrit && inscription.typeInscrit !== req.filtreRole.typeInscrit) {
      return res.status(403).json({ message: 'Accès refusé : cette inscription ne fait pas partie de votre périmètre.' });
    }

    if (!transitionAutorisee(inscription.statut, statut)) {
      return res.status(400).json({
        message: 'Une inscription confirmée ne peut plus repasser "en attente" : choisissez "re-réservé" ou "annulée".',
      });
    }

    const erreursEmail = await appliquerStatut(inscription, statut);

    res.json({ inscription, erreursEmail });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PATCH /api/inscriptions/bulk-statut — admin, valider/annuler plusieurs inscriptions en une fois
// Body : { ids: ['...', '...'], statut: 'confirme' }  -> uniquement les ids sélectionnés
//     ou { tous: true, statut: 'confirme' }            -> toutes les inscriptions en attente (selon le rôle)
router.patch('/bulk-statut', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const { ids, tous, statut } = req.body;
    if (!['en_attente', 'confirme', 're_reserve', 'annule'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    let filter;
    if (tous) {
      filter = { ...req.filtreRole, statut: 'en_attente' };
    } else {
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Aucune inscription sélectionnée' });
      }
      filter = { ...req.filtreRole, _id: { $in: ids } };
    }

    const inscriptions = await Inscription.find(filter).populate('creneau');

    let succes = 0;
    const echecs = [];

    for (const inscription of inscriptions) {
      try {
        if (!inscription.creneau) {
          echecs.push({ id: inscription._id, erreur: 'Créneau introuvable' });
          continue;
        }
        if (!transitionAutorisee(inscription.statut, statut)) {
          echecs.push({ id: inscription._id, erreur: 'Transition de statut non autorisée' });
          continue;
        }

        await appliquerStatut(inscription, statut);
        succes += 1;
      } catch (e) {
        echecs.push({ id: inscription._id, erreur: e.message });
      }
    }

    res.json({
      message: `${succes} inscription(s) mise(s) à jour${echecs.length ? `, ${echecs.length} échec(s)` : ''}.`,
      succes,
      echecs,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PATCH /api/inscriptions/:id/re-reserver — admin, réassigne directement un nouveau
// créneau/date à une inscription existante (typiquement après un statut "re_reserve"),
// sans ressaisir les données du participant/de l'équipe. Repasse l'inscription "en attente".
router.patch('/:id/re-reserver', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const { creneauId, date } = req.body;
    if (!creneauId || !date) {
      return res.status(400).json({ message: 'Le créneau et la date sont requis' });
    }

    const inscription = await Inscription.findById(req.params.id);
    if (!inscription) return res.status(404).json({ message: 'Inscription introuvable' });
    if (req.filtreRole.typeInscrit && inscription.typeInscrit !== req.filtreRole.typeInscrit) {
      return res.status(403).json({ message: 'Accès refusé : cette inscription ne fait pas partie de votre périmètre.' });
    }
    if (inscription.statut === 'confirme') {
      return res.status(400).json({ message: 'Cette inscription est déjà confirmée sur un créneau. Passez-la d\'abord en "re-réservé".' });
    }

    const dateChoisie = debutJournee(date);
    if (Number.isNaN(dateChoisie.getTime())) {
      return res.status(400).json({ message: 'Date invalide' });
    }

    const creneau = await Creneau.findById(creneauId);
    if (!creneau || !creneau.actif) {
      return res.status(404).json({ message: 'Créneau introuvable ou inactif' });
    }
    if (creneau.type !== 'mixte' && creneau.type !== inscription.typeInscrit) {
      return res.status(400).json({ message: `Ce créneau est réservé aux ${creneau.type}s` });
    }

    const lendemain = ajouterJours(dateChoisie, 1);
    const reservesCeJour = await Inscription.countDocuments({
      _id: { $ne: inscription._id },
      creneau: creneauId,
      date: { $gte: dateChoisie, $lt: lendemain },
      statut: { $in: STATUTS_OCCUPANTS },
    });
    if (reservesCeJour >= creneau.nombrePlaces) {
      return res.status(400).json({ message: 'Ce créneau est complet pour cette date' });
    }

    inscription.creneau = creneauId;
    inscription.date = dateChoisie;
    inscription.statut = 'en_attente';
    inscription.confirme = false;
    inscription.dateConfirmation = undefined;
    await inscription.save();

    res.json({ inscription: await inscription.populate('creneau') });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/inscriptions/:id — admin, supprimer définitivement une inscription
router.delete('/:id', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...req.filtreRole };
    const inscription = await Inscription.findOneAndDelete(filter);
    if (!inscription) return res.status(404).json({ message: 'Inscription introuvable' });
    res.json({ message: 'Inscription supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/inscriptions/bulk — admin, supprimer plusieurs inscriptions en une fois
// Body : { ids: ['...', '...'] }
router.delete('/bulk/supprimer', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Aucune inscription sélectionnée' });
    }
    const filter = { _id: { $in: ids }, ...req.filtreRole };
    const resultat = await Inscription.deleteMany(filter);
    res.json({ message: `${resultat.deletedCount} inscription(s) supprimée(s)`, supprimees: resultat.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/inscriptions/export/champs — catalogue des champs disponibles pour l'export Excel
router.get('/export/champs', authMiddleware, (req, res) => {
  res.json(CHAMPS_EXPORT.map(({ id, label, groupe }) => ({ id, label, groupe })));
});

// POST /api/inscriptions/export — génère et télécharge un fichier Excel des inscriptions
// Body : { champs: ['nomComplet', 'email', ...], statut?, typeInscrit? }
router.post('/export', authMiddleware, restreindreInscriptionsParRole, async (req, res) => {
  try {
    const { champs, statut, typeInscrit } = req.body;

    const filter = { ...req.filtreRole };
    if (statut) filter.statut = statut;
    if (typeInscrit && !req.filtreRole.typeInscrit) filter.typeInscrit = typeInscrit;

    const inscriptions = await Inscription.find(filter).populate('creneau').sort({ createdAt: -1 });
    const workbook = await genererClasseurInscriptions(inscriptions, champs);

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="inscriptions-${dateStr}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

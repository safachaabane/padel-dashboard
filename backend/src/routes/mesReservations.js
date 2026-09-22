const express = require('express');
const Inscription = require('../models/Inscription');
const Creneau = require('../models/Creneau');
const { getParametre, getParametresPourType } = require('../utils/parametres');
const { debutJournee, ajouterJours, creneauDansPlage } = require('../utils/dateUtils');
const { sendAnnulationResponsableEmail, sendNouvelleInscriptionResponsableEmail } = require('../utils/email');

const router = express.Router();

const STATUTS_OCCUPANTS = ['en_attente', 'confirme'];
const DELAI_ANNULATION_HEURES = 48;

// Renvoie l'heure de début réelle (date + heureDebut du créneau) d'une inscription peuplée.
function debutReservation(inscription) {
  if (!inscription.creneau) return new Date(inscription.date);
  const [h, m] = String(inscription.creneau.heureDebut).split(':').map(Number);
  const d = new Date(inscription.date);
  d.setHours(h, m, 0, 0);
  return d;
}

function peutAnnuler(inscription) {
  if (!['en_attente', 'confirme'].includes(inscription.statut)) return false;
  const limite = new Date(debutReservation(inscription).getTime() - DELAI_ANNULATION_HEURES * 60 * 60 * 1000);
  return new Date() < limite;
}

// GET /api/mes-reservations/:token — infos publiques pour l'espace "Ma réservation"
router.get('/:token', async (req, res) => {
  try {
    const inscription = await Inscription.findOne({ tokenGestion: req.params.token }).populate('creneau');
    if (!inscription) return res.status(404).json({ message: 'Lien invalide ou expiré' });

    res.json({
      nomComplet: inscription.nomComplet,
      typeInscrit: inscription.typeInscrit,
      societe: inscription.societe,
      invites: inscription.invites,
      date: inscription.date,
      creneau: inscription.creneau ? {
        heureDebut: inscription.creneau.heureDebut,
        heureFin: inscription.creneau.heureFin,
      } : null,
      statut: inscription.statut,
      peutAnnuler: peutAnnuler(inscription),
      doitReReserver: inscription.statut === 're_reserve',
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/mes-reservations/:token/annuler — le participant annule lui-même sa réservation
// (uniquement possible jusqu'à 48h avant le début du créneau). Notifie le(s) responsable(s).
router.post('/:token/annuler', async (req, res) => {
  try {
    const inscription = await Inscription.findOne({ tokenGestion: req.params.token }).populate('creneau');
    if (!inscription) return res.status(404).json({ message: 'Lien invalide ou expiré' });

    if (!peutAnnuler(inscription)) {
      return res.status(400).json({
        message: inscription.statut === 'annule'
          ? 'Cette réservation est déjà annulée.'
          : `L'annulation n'est plus possible (moins de ${DELAI_ANNULATION_HEURES}h avant le créneau, ou statut non annulable).`,
      });
    }

    inscription.statut = 'annule';
    inscription.dateAnnulation = new Date();
    inscription.annulePar = 'participant';
    await inscription.save();

    try {
      const cle = inscription.typeInscrit === 'client' ? 'emailsResponsableClient' : 'emailsResponsablePersonnel';
      const emails = await getParametre(cle);
      for (const to of emails || []) {
        await sendAnnulationResponsableEmail({
          to,
          nomComplet: inscription.nomComplet,
          typeInscrit: inscription.typeInscrit,
          creneau: inscription.creneau,
          date: inscription.date,
        });
      }
    } catch (err) {
      console.error('Erreur envoi mail responsable (annulation):', err.message);
    }

    res.json({ message: 'Votre réservation a bien été annulée.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/mes-reservations/:token/re-reserver — le participant choisit un nouveau créneau
// après un passage en statut "re_reserve" ; ses informations (équipe, contact...) sont conservées.
router.post('/:token/re-reserver', async (req, res) => {
  try {
    const { creneauId, date } = req.body;
    if (!creneauId || !date) {
      return res.status(400).json({ message: 'Le créneau et la date sont requis' });
    }

    const inscription = await Inscription.findOne({ tokenGestion: req.params.token });
    if (!inscription) return res.status(404).json({ message: 'Lien invalide ou expiré' });
    if (inscription.statut !== 're_reserve') {
      return res.status(400).json({ message: 'Cette réservation ne nécessite pas de re-réservation.' });
    }

    const dateChoisie = debutJournee(date);
    if (Number.isNaN(dateChoisie.getTime())) {
      return res.status(400).json({ message: 'Date invalide' });
    }

    const { delaiMinJours, joursCalendrierVisibles, heureOuverture, heureFermeture } =
      await getParametresPourType(inscription.typeInscrit);
    const dateMin = ajouterJours(new Date(), delaiMinJours);
    const dateMax = ajouterJours(new Date(), joursCalendrierVisibles);
    if (dateChoisie < dateMin || dateChoisie > dateMax) {
      return res.status(400).json({ message: "Cette date n'est pas ouverte à la réservation." });
    }

    const creneau = await Creneau.findById(creneauId);
    if (!creneau || !creneau.actif) {
      return res.status(404).json({ message: 'Créneau introuvable ou inactif' });
    }
    if (creneau.type !== 'mixte' && creneau.type !== inscription.typeInscrit) {
      return res.status(400).json({ message: `Ce créneau est réservé aux ${creneau.type}s` });
    }
    if (!creneauDansPlage(creneau.heureDebut, creneau.heureFin, heureOuverture, heureFermeture)) {
      return res.status(400).json({ message: 'Ce créneau est en dehors des horaires de réservation.' });
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

    // Le passage en "en attente" nécessite une nouvelle confirmation admin : on renotifie
    // le(s) responsable(s), comme pour une nouvelle inscription (best-effort).
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
      console.error('Erreur envoi mail responsable (re-réservation):', err.message);
    }

    res.json({ message: 'Votre nouveau créneau a bien été enregistré, en attente de confirmation.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

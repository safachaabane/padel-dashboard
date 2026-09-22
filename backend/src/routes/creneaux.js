const express = require('express');
const Creneau = require('../models/Creneau');
const Inscription = require('../models/Inscription');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getParametre, getParametresPourType } = require('../utils/parametres');
const { debutJournee, ajouterJours, debutSemaine, finSemaine, jourSemaine, creneauDansPlage } = require('../utils/dateUtils');

// Statuts qui "consomment" une place / comptent dans le quota hebdomadaire.
// Une inscription re-réservée ou annulée libère sa place.
const STATUTS_OCCUPANTS = ['en_attente', 'confirme'];

const router = express.Router();

// GET /api/creneaux — publique, liste les gabarits de créneaux actifs (sans notion de date)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // filtrer par type si besoin
    const filter = { actif: true };
    if (type && type !== 'mixte') {
      filter.$or = [{ type }, { type: 'mixte' }];
    }

    const creneaux = await Creneau.find(filter).sort({ heureDebut: 1 });
    res.json(creneaux);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/creneaux/disponibilites?date=YYYY-MM-DD&type=client|personnel
// Publique — pour une date donnée, renvoie les créneaux compatibles avec leur
// disponibilité réelle ce jour-là (places restantes), ainsi que l'état du quota
// hebdomadaire du type concerné.
router.get('/disponibilites', async (req, res) => {
  try {
    const { date, type } = req.query;
    if (!date) return res.status(400).json({ message: 'Le paramètre date est requis' });
    if (!['client', 'personnel'].includes(type)) {
      return res.status(400).json({ message: 'Le paramètre type doit être "client" ou "personnel"' });
    }

    const dateChoisie = debutJournee(date);
    if (Number.isNaN(dateChoisie.getTime())) {
      return res.status(400).json({ message: 'Date invalide' });
    }

    // Vérifie que la date respecte la fenêtre de réservation autorisée (délai/fenêtre communs
    // + jours de la semaine ouverts pour ce type, ex: du lundi au vendredi uniquement)
    const { delaiMinJours, joursCalendrierVisibles, joursOuverts } = await getParametresPourType(type);
    const dateMin = ajouterJours(new Date(), delaiMinJours);
    const dateMax = ajouterJours(new Date(), joursCalendrierVisibles);

    if (dateChoisie < dateMin || dateChoisie > dateMax) {
      return res.status(400).json({
        message: `Cette date n'est pas ouverte à la réservation (réservation possible entre ${delaiMinJours} et ${joursCalendrierVisibles} jours à l'avance).`,
      });
    }
    if (!joursOuverts.includes(jourSemaine(dateChoisie))) {
      return res.status(400).json({ message: "Aucun créneau n'est ouvert ce jour-là. Merci de choisir une autre date." });
    }

    // Quota hebdomadaire du type concerné, pour la semaine contenant la date choisie
    const cleLimite = type === 'client' ? 'limiteHebdomadaireClient' : 'limiteHebdomadairePersonnel';
    const limiteHebdo = await getParametre(cleLimite);
    const debutSem = debutSemaine(dateChoisie);
    const finSem = finSemaine(dateChoisie);
    const reservationsSemaine = await Inscription.countDocuments({
      typeInscrit: type,
      date: { $gte: debutSem, $lte: finSem },
      statut: { $in: STATUTS_OCCUPANTS },
    });
    const quotaAtteint = reservationsSemaine >= limiteHebdo;

    // Créneaux (gabarits) compatibles avec le type, puis filtrés par la plage horaire
    // globale configurée pour ce type (ex: 9h-18h désactive les créneaux hors plage)
    const { heureOuverture, heureFermeture } = await getParametresPourType(type);
    const filtreType = { actif: true, $or: [{ type }, { type: 'mixte' }] };
    const gabarits = (await Creneau.find(filtreType).sort({ heureDebut: 1 }))
      .filter((g) => creneauDansPlage(g.heureDebut, g.heureFin, heureOuverture, heureFermeture));

    const lendemain = ajouterJours(dateChoisie, 1);
    const creneaux = await Promise.all(gabarits.map(async (g) => {
      const reserves = await Inscription.countDocuments({
        creneau: g._id,
        date: { $gte: dateChoisie, $lt: lendemain },
        statut: { $in: STATUTS_OCCUPANTS },
      });
      const placesRestantes = Math.max(g.nombrePlaces - reserves, 0);
      return {
        ...g.toJSON(),
        placesRestantes,
        complet: placesRestantes <= 0,
      };
    }));

    res.json({
      date: dateChoisie,
      quotaHebdomadaire: { limite: limiteHebdo, utilisees: reservationsSemaine, atteint: quotaAtteint },
      creneaux,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/creneaux/all — admin (super admin uniquement), tous les gabarits de créneaux
router.get('/all', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const creneaux = await Creneau.find().sort({ heureDebut: 1 });
    res.json(creneaux);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/creneaux — admin (super admin uniquement), créer un gabarit de créneau
router.post('/', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { heureDebut, heureFin, nombrePlaces, type, actif } = req.body;

    if (!heureDebut || !heureFin || !nombrePlaces || !type) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }

    const creneau = await Creneau.create({
      heureDebut,
      heureFin,
      nombrePlaces,
      type,
      actif: actif !== undefined ? actif : true,
    });

    res.status(201).json(creneau);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT /api/creneaux/:id — admin (super admin uniquement), modifier un gabarit de créneau
router.put('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { heureDebut, heureFin, nombrePlaces, type, actif } = req.body;
    const creneau = await Creneau.findByIdAndUpdate(
      req.params.id,
      { heureDebut, heureFin, nombrePlaces, type, actif },
      { new: true, runValidators: true }
    );
    if (!creneau) return res.status(404).json({ message: 'Créneau introuvable' });
    res.json(creneau);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/creneaux/:id — admin (super admin uniquement), supprimer
router.delete('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const creneau = await Creneau.findByIdAndDelete(req.params.id);
    if (!creneau) return res.status(404).json({ message: 'Créneau introuvable' });
    res.json({ message: 'Créneau supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

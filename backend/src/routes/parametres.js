const express = require('express');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getTousParametres, getParametresPourType, setParametres } = require('../utils/parametres');

const router = express.Router();

// GET /api/parametres/public?type=client|personnel — publique, valeurs nécessaires au
// formulaire de réservation (délai minimum, fenêtre du calendrier, jours ouverts et plage
// horaire pour le type demandé). Sans `type`, renvoie uniquement le délai/la fenêtre communs.
// Aucune donnée sensible (les emails responsables ne sont jamais exposés ici).
router.get('/public', async (req, res) => {
  try {
    const { type } = req.query;
    if (type === 'client' || type === 'personnel') {
      return res.json(await getParametresPourType(type));
    }
    const { delaiMinJours, joursCalendrierVisibles } = await getTousParametres();
    res.json({ delaiMinJours, joursCalendrierVisibles });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/parametres — admin (super admin uniquement), tous les paramètres
router.get('/', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const parametres = await getTousParametres();
    res.json(parametres);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT /api/parametres — admin (super admin uniquement), modifier un ou plusieurs paramètres
router.put('/', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const parametres = await setParametres(req.body);
    res.json(parametres);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

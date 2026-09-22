const express = require('express');
const Inscription = require('../models/Inscription');

const router = express.Router();

// GET /api/satisfaction/:token — infos publiques pour pré-remplir le mini-formulaire
router.get('/:token', async (req, res) => {
  try {
    const inscription = await Inscription.findOne({ 'satisfaction.token': req.params.token })
      .populate('creneau');

    if (!inscription) {
      return res.status(404).json({ message: 'Lien invalide ou expiré' });
    }

    const entree = inscription.satisfaction.find((s) => s.token === req.params.token);
    if (!entree) {
      return res.status(404).json({ message: 'Lien invalide ou expiré' });
    }

    res.json({
      nom: entree.nom,
      email: entree.email,
      role: entree.role,
      dejaRepondu: entree.repondu,
      note: entree.note,
      commentaire: entree.commentaire,
      creneau: inscription.creneau ? {
        date: inscription.date,
        heureDebut: inscription.creneau.heureDebut,
        heureFin: inscription.creneau.heureFin,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/satisfaction/:token — enregistrer la réponse de satisfaction (une seule fois)
router.post('/:token', async (req, res) => {
  try {
    const { note, commentaire } = req.body;
    const noteNum = Number(note);

    if (!noteNum || noteNum < 1 || noteNum > 5) {
      return res.status(400).json({ message: 'Merci de donner une note entre 1 et 5' });
    }

    const inscription = await Inscription.findOne({ 'satisfaction.token': req.params.token });
    if (!inscription) {
      return res.status(404).json({ message: 'Lien invalide ou expiré' });
    }

    const entree = inscription.satisfaction.find((s) => s.token === req.params.token);
    if (!entree) {
      return res.status(404).json({ message: 'Lien invalide ou expiré' });
    }
    if (entree.repondu) {
      return res.status(400).json({ message: 'Vous avez déjà donné votre avis, merci !' });
    }

    entree.note = noteNum;
    entree.commentaire = (commentaire || '').trim();
    entree.repondu = true;
    entree.dateReponse = new Date();
    await inscription.save();

    res.json({ message: 'Merci pour votre retour !' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

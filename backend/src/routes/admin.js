const express = require('express');
const Inscription = require('../models/Inscription');
const Creneau = require('../models/Creneau');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

const ROLES_VALIDES = ['super_admin', 'admin_clients', 'admin_personnel'];

// GET /api/admin/stats — statistiques du dashboard (réservé au super admin)
router.get('/stats', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const [
      totalCreneaux,
      creneauxActifs,
      totalInscriptions,
      inscriptionsConfirmees,
      inscriptionsEnAttente,
      inscriptionsReReservees,
      inscriptionsAnnulees,
      totalClients,
      totalPersonnel,
    ] = await Promise.all([
      Creneau.countDocuments(),
      Creneau.countDocuments({ actif: true }),
      Inscription.countDocuments(),
      Inscription.countDocuments({ statut: 'confirme' }),
      Inscription.countDocuments({ statut: 'en_attente' }),
      Inscription.countDocuments({ statut: 're_reserve' }),
      Inscription.countDocuments({ statut: 'annule' }),
      Inscription.countDocuments({ typeInscrit: 'client' }),
      Inscription.countDocuments({ typeInscrit: 'personnel' }),
    ]);

    // Inscriptions des 7 derniers jours
    const il_y_a_7_jours = new Date();
    il_y_a_7_jours.setDate(il_y_a_7_jours.getDate() - 7);

    const inscriptionsRecentes = await Inscription.find({
      createdAt: { $gte: il_y_a_7_jours },
    })
      .populate('creneau')
      .sort({ createdAt: -1 })
      .limit(10);

    // Prochaines réservations à venir (basées sur la date choisie par les inscrits,
    // les créneaux eux-mêmes n'étant plus que des gabarits horaires sans date propre)
    const prochainsCreneaux = await Inscription.find({
      statut: { $ne: 'annule' },
      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    })
      .populate('creneau')
      .sort({ date: 1 })
      .limit(5);

    res.json({
      creneaux: { total: totalCreneaux, actifs: creneauxActifs },
      inscriptions: {
        total: totalInscriptions,
        confirmees: inscriptionsConfirmees,
        enAttente: inscriptionsEnAttente,
        reReservees: inscriptionsReReservees,
        annulees: inscriptionsAnnulees,
        clients: totalClients,
        personnel: totalPersonnel,
      },
      inscriptionsRecentes,
      prochainsCreneaux,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ============================================================
// Gestion des administrateurs (réservée au super admin)
// ============================================================

// GET /api/admin/admins — liste des administrateurs
router.get('/admins', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: 1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/admin/admins — créer un nouvel administrateur (super_admin, admin_clients ou admin_personnel)
router.post('/admins', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { email, password, nom, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, mot de passe et rôle sont requis' });
    }
    if (!ROLES_VALIDES.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const existant = await Admin.findOne({ email: email.toLowerCase() });
    if (existant) {
      return res.status(400).json({ message: 'Un administrateur avec cet email existe déjà' });
    }

    const admin = await Admin.create({
      email: email.toLowerCase(),
      password,
      nom: nom || 'Administrateur',
      role,
    });

    res.status(201).json({ id: admin._id, email: admin.email, nom: admin.nom, role: admin.role });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/admin/admins/:id — supprimer un administrateur
router.delete('/admins/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.admin._id)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrateur introuvable' });

    res.json({ message: 'Administrateur supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

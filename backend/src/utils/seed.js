const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    // Super admin par défaut (accès complet)
    const existing = await Admin.findOne({ email: (process.env.ADMIN_EMAIL || 'admin@padel.com').toLowerCase() });
    if (!existing) {
      await Admin.create({
        email: process.env.ADMIN_EMAIL || 'admin@padel.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        nom: 'Super Administrateur',
        role: 'super_admin',
      });
      console.log('✅ Super admin créé:', process.env.ADMIN_EMAIL || 'admin@padel.com');
    }

    // Admin "Clients" (optionnel) — accès uniquement à la liste des clients inscrits.
    // Renseigner ADMIN_CLIENTS_EMAIL et ADMIN_CLIENTS_PASSWORD dans .env pour l'activer,
    // ou créer ce compte plus tard depuis l'interface "Administrateurs" (super admin).
    if (process.env.ADMIN_CLIENTS_EMAIL && process.env.ADMIN_CLIENTS_PASSWORD) {
      const existeClients = await Admin.findOne({ email: process.env.ADMIN_CLIENTS_EMAIL.toLowerCase() });
      if (!existeClients) {
        await Admin.create({
          email: process.env.ADMIN_CLIENTS_EMAIL,
          password: process.env.ADMIN_CLIENTS_PASSWORD,
          nom: process.env.ADMIN_CLIENTS_NOM || 'Administrateur Clients',
          role: 'admin_clients',
        });
        console.log('✅ Admin "Clients" créé:', process.env.ADMIN_CLIENTS_EMAIL);
      }
    }

    // Admin "Personnel" (optionnel) — accès uniquement à la liste du personnel inscrit.
    if (process.env.ADMIN_PERSONNEL_EMAIL && process.env.ADMIN_PERSONNEL_PASSWORD) {
      const existePersonnel = await Admin.findOne({ email: process.env.ADMIN_PERSONNEL_EMAIL.toLowerCase() });
      if (!existePersonnel) {
        await Admin.create({
          email: process.env.ADMIN_PERSONNEL_EMAIL,
          password: process.env.ADMIN_PERSONNEL_PASSWORD,
          nom: process.env.ADMIN_PERSONNEL_NOM || 'Administrateur Personnel',
          role: 'admin_personnel',
        });
        console.log('✅ Admin "Personnel" créé:', process.env.ADMIN_PERSONNEL_EMAIL);
      }
    }
  } catch (err) {
    console.error('Erreur seed admin:', err.message);
  }
};

module.exports = { seedAdmin };

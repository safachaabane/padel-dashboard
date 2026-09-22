const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  nom: { type: String, default: 'Administrateur' },

  // Rôle de l'administrateur :
  // - super_admin     : accès complet (dashboard, créneaux, toutes les inscriptions, gestion des admins)
  // - admin_clients   : accès uniquement à la liste des clients inscrits
  // - admin_personnel : accès uniquement à la liste du personnel inscrit
  role: {
    type: String,
    enum: ['super_admin', 'admin_clients', 'admin_personnel'],
    default: 'super_admin',
  },
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);

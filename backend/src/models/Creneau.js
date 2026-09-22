const mongoose = require('mongoose');

// Un "créneau" est maintenant un GABARIT HORAIRE réutilisable chaque jour
// (ex: 09:00 - 10:30, pour les clients), et n'est plus lié à une date précise.
// La date effective de la réservation est choisie par l'utilisateur dans le
// formulaire (voir Inscription.date) et la disponibilité (places restantes)
// est calculée dynamiquement pour la paire (créneau, date).
const creneauSchema = new mongoose.Schema({
  heureDebut: { type: String, required: true }, // ex: "09:00"
  heureFin:   { type: String, required: true }, // ex: "10:30"

  // Nombre d'équipes pouvant réserver ce créneau horaire pour UNE MÊME date
  nombrePlaces: { type: Number, required: true, min: 1, default: 1 },

  type: {
    type: String,
    enum: ['client', 'personnel', 'mixte'],
    required: true,
  },

  actif: { type: Boolean, default: true },
}, { timestamps: true });

// Combine une date donnée (fournie par l'appelant, ex: inscription.date) avec
// l'heure de début/fin de ce gabarit pour obtenir un objet Date complet.
creneauSchema.methods.getDateHeureDebut = function (date) {
  const [h, m] = this.heureDebut.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

creneauSchema.methods.getDateHeureFin = function (date) {
  const [h, m] = this.heureFin.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

creneauSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Creneau', creneauSchema);

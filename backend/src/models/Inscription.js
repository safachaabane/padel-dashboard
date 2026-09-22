const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Un coéquipier invité par le participant principal (nom complet obligatoire,
// email optionnel : un invité peut ne pas avoir/vouloir donner son email).
const inviteSchema = new mongoose.Schema({
  nom:   { type: String, required: true, trim: true },
  email: { type: String, required: false, lowercase: true, trim: true, default: '' },
}, { _id: false });

// Une entrée de satisfaction = une personne (le participant OU un de ses invités)
// à qui on doit envoyer un mail de satisfaction après le créneau, avec son propre lien/token.
const satisfactionSchema = new mongoose.Schema({
  role:  { type: String, enum: ['participant', 'invite'], required: true },
  nom:   { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },

  // Token unique permettant d'accéder au formulaire de satisfaction (/satisfaction/:token)
  token: { type: String, default: () => uuidv4(), unique: true, sparse: true },

  envoye:      { type: Boolean, default: false },
  dateEnvoi:   { type: Date },

  repondu:      { type: Boolean, default: false },
  note:         { type: Number, min: 1, max: 5 },
  commentaire:  { type: String, trim: true },
  dateReponse:  { type: Date },
}, { _id: false });

const inscriptionSchema = new mongoose.Schema({
  typeInscrit: {
    type: String,
    enum: ['client', 'personnel'],
    required: true,
  },

  // Champs communs (participant principal)
  nomComplet: { type: String, required: true, trim: true },
  telephone:  { type: String, required: true, trim: true },
  email:      { type: String, required: true, lowercase: true, trim: true },

  // Société du client (uniquement pour les inscriptions de type "client")
  societe: { type: String, trim: true },

  // Le padel se joue en équipe de 4 : le participant principal + 3 autres joueurs invités
  invites: {
    type: [inviteSchema],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length === 3,
      message: "Une équipe de padel doit compter exactement 4 joueurs : merci de renseigner les 3 autres membres de l'équipe.",
    },
  },

  // Créneau (gabarit horaire) choisi
  creneau: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creneau',
    required: true,
  },

  // Date effective choisie par l'utilisateur dans le calendrier (le créneau
  // lui-même n'est qu'un horaire réutilisable chaque jour, sans date propre)
  date: { type: Date, required: true },

  // Adresse IP utilisée lors de l'inscription (traçabilité)
  ipAddress: { type: String, trim: true },

  // Statut de la validation par un administrateur
  // (confirme = true dès que le mail de validation a été envoyé avec succès)
  confirme: { type: Boolean, default: false },
  dateConfirmation: { type: Date },

  // Statut général
  // - en_attente : nouvelle inscription, pas encore traitée par un admin
  // - confirme   : validée par un admin (mail de confirmation envoyé)
  // - re_reserve : la date/le créneau confirmé n'est finalement plus disponible ; le
  //                participant (ou un admin) doit choisir un nouveau créneau
  // - annule     : annulée (par le participant ou par un admin)
  statut: {
    type: String,
    enum: ['en_attente', 'confirme', 're_reserve', 'annule'],
    default: 'en_attente',
  },

  // Jeton unique permettant au participant d'accéder à son espace "Ma réservation"
  // (annulation avant 48h, re-réservation en cas de statut re_reserve) sans compte.
  tokenGestion: { type: String, default: () => uuidv4(), unique: true, sparse: true },

  // Traçabilité de l'annulation / re-réservation
  dateAnnulation: { type: Date },
  annulePar: { type: String, enum: ['participant', 'admin'], default: undefined },
  dateReReservation: { type: Date }, // date à laquelle le statut re_reserve a été déclenché

  // Suivi de la satisfaction post-créneau : une entrée par personne (participant + 3 invités)
  satisfaction: { type: [satisfactionSchema], default: [] },
}, { timestamps: true });

// Index utiles
inscriptionSchema.index({ email: 1, creneau: 1 });
inscriptionSchema.index({ telephone: 1 });
inscriptionSchema.index({ ipAddress: 1 });
inscriptionSchema.index({ 'invites.email': 1 }, { sparse: true }); // email invité optionnel
inscriptionSchema.index({ 'satisfaction.token': 1 });
inscriptionSchema.index({ tokenGestion: 1 });

// Utilisés pour calculer les places restantes d'un (créneau, date) et le quota hebdomadaire par type
inscriptionSchema.index({ creneau: 1, date: 1, statut: 1 });
inscriptionSchema.index({ typeInscrit: 1, date: 1, statut: 1 });

module.exports = mongoose.model('Inscription', inscriptionSchema);

const mongoose = require("mongoose");

// Petit store clé/valeur générique, utilisé notamment pour mémoriser la date
// du dernier envoi du rapport périodique (liste des participants toutes les 48h).
const parametreSchema = new mongoose.Schema(
  {
    cle: { type: String, required: true, unique: true },
    valeur: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parametre", parametreSchema);

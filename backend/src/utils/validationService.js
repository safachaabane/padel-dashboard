const Inscription = require('../models/Inscription');
const { sendValidationEmail } = require('./email');

/**
 * Envoie le mail de validation (avec détails créneau + Wi-Fi) au participant principal
 * et à chacun de ses invités qui ont fourni un email.
 *
 * Idempotent ET protégé contre les envois concurrents/en double : on "réclame" d'abord
 * atomiquement le passage confirme=false -> true en base (findOneAndUpdate avec un
 * filtre confirme:{$ne:true}). Si un autre appel (double-clic, double requête, retry
 * réseau, validation en masse déclenchée deux fois...) a déjà fait ce passage entre
 * temps, cet appel-ci ne renvoie RIEN — ce qui élimine toute possibilité d'envoyer
 * plusieurs fois les mêmes emails de validation pour une même inscription.
 */
async function envoyerEmailsValidation(inscription, creneau) {
  const reclamation = await Inscription.findOneAndUpdate(
    { _id: inscription._id, confirme: { $ne: true } },
    { $set: { confirme: true, dateConfirmation: new Date() } }
  );

  if (!reclamation) {
    // Déjà confirmé (ou en cours de confirmation par un autre appel concurrent) : on ne renvoie rien.
    return { dejaEnvoye: true, erreurs: [] };
  }

  // On reflète la réclamation sur le document en mémoire pour que le .save() qui suivra
  // dans la route n'écrase pas ces champs avec leur ancienne valeur (false).
  inscription.confirme = true;
  inscription.dateConfirmation = new Date();

  const erreurs = [];

  try {
    await sendValidationEmail({
      to: inscription.email,
      nomComplet: inscription.nomComplet,
      creneau,
      date: inscription.date,
      typeInscrit: inscription.typeInscrit,
      estInvite: false,
      tokenGestion: inscription.tokenGestion,
    });
  } catch (err) {
    erreurs.push({ email: inscription.email, erreur: err.message });
  }

  // On n'envoie qu'aux invités ayant renseigné un email (désormais optionnel)
  for (const invite of inscription.invites) {
    if (!invite.email) continue;
    try {
      await sendValidationEmail({
        to: invite.email,
        nomComplet: invite.nom,
        creneau,
        date: inscription.date,
        typeInscrit: inscription.typeInscrit,
        estInvite: true,
        inviteurNomComplet: inscription.nomComplet,
      });
    } catch (err) {
      erreurs.push({ email: invite.email, erreur: err.message });
    }
  }

  return { dejaEnvoye: false, erreurs };
}

module.exports = { envoyerEmailsValidation };

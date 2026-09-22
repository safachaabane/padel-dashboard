const cron = require('node-cron');
const Inscription = require('../models/Inscription');
const { sendSatisfactionEmail } = require('./email');

/**
 * Recherche les inscriptions confirmées dont le créneau est terminé et envoie,
 * pour chaque personne (participant + invités) n'ayant pas encore reçu son mail
 * de satisfaction, un email avec un lien vers le mini-formulaire d'avis.
 */
async function traiterEnvoisSatisfaction() {
  try {
    const maintenant = new Date();

    const inscriptions = await Inscription.find({
      statut: 'confirme',
      'satisfaction.envoye': false,
    }).populate('creneau');

    for (const inscription of inscriptions) {
      const creneau = inscription.creneau;
      if (!creneau) continue;

      // Le créneau doit être terminé (date + heure de fin déjà passées) avant d'envoyer la satisfaction
      const dateFinCreneau = creneau.getDateHeureFin(inscription.date);
      if (maintenant < dateFinCreneau) continue;

      let modifie = false;
      for (const entree of inscription.satisfaction) {
        if (entree.envoye) continue;
        try {
          await sendSatisfactionEmail({
            to: entree.email,
            nom: entree.nom,
            creneau,
            date: inscription.date,
            token: entree.token,
          });
          entree.envoye = true;
          entree.dateEnvoi = new Date();
          modifie = true;
        } catch (err) {
          console.error(`⚠️  Erreur envoi email satisfaction à ${entree.email}:`, err.message);
        }
      }

      if (modifie) {
        await inscription.save();
      }
    }
  } catch (err) {
    console.error('Erreur lors du traitement des envois de satisfaction:', err.message);
  }
}

/**
 * Démarre la tâche planifiée : vérifie toutes les 15 minutes si des emails de
 * satisfaction doivent être envoyés (créneaux terminés depuis la dernière vérification).
 */
function demarrerCronSatisfaction() {
  cron.schedule('*/15 * * * *', traiterEnvoisSatisfaction);
  console.log('🕒 Cron de satisfaction démarré (vérification toutes les 15 minutes)');
}

module.exports = { demarrerCronSatisfaction, traiterEnvoisSatisfaction };

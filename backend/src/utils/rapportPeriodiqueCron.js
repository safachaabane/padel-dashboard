const cron = require('node-cron');
const Inscription = require('../models/Inscription');
const Parametre = require('../models/Parametre');
const { sendListeParticipantsEmail } = require('./email');
const { genererClasseurInscriptions } = require('./exportExcel');

const CLE_PARAMETRE = 'liste_participants_dernier_envoi';
const INTERVALLE_HEURES = 48;
const DESTINATAIRE = process.env.EMAIL_RAPPORT_PARTICIPANTS || 'safa1chaabane@mail.com';

/**
 * Vérifie si 48h se sont écoulées depuis le dernier rapport ; si oui, regarde s'il y a eu de
 * nouvelles inscriptions depuis cette date et, seulement dans ce cas, envoie le rapport (avec un
 * Excel complet en pièce jointe) à l'adresse de suivi. La fenêtre de 48h avance à chaque
 * vérification, qu'il y ait eu un envoi ou non, pour ne jamais dériver dans le temps.
 */
async function verifierEtEnvoyerRapport() {
  try {
    let parametre = await Parametre.findOne({ cle: CLE_PARAMETRE });

    // Premier démarrage : on initialise la fenêtre à "maintenant" pour ne pas renvoyer
    // tout l'historique des inscriptions existantes dès le premier passage du cron.
    if (!parametre) {
      await Parametre.create({ cle: CLE_PARAMETRE, valeur: new Date() });
      console.log('🕒 Rapport périodique : initialisation de la fenêtre de suivi (premier démarrage)');
      return;
    }

    const dernierEnvoi = new Date(parametre.valeur);
    const heuresEcoulees = (Date.now() - dernierEnvoi.getTime()) / 3_600_000;

    if (heuresEcoulees < INTERVALLE_HEURES) return; // pas encore 48h, on attend la prochaine vérification

    const nouvellesInscriptions = await Inscription.find({ createdAt: { $gt: dernierEnvoi } })
      .populate('creneau')
      .sort({ createdAt: -1 });

    if (nouvellesInscriptions.length > 0) {
      const workbook = await genererClasseurInscriptions(nouvellesInscriptions);
      const buffer = await workbook.xlsx.writeBuffer();
      const dateStr = new Date().toISOString().slice(0, 10);

      await sendListeParticipantsEmail({
        to: DESTINATAIRE,
        inscriptions: nouvellesInscriptions,
        pieceJointe: { nom: `nouveaux-participants-${dateStr}.xlsx`, buffer },
      });

      console.log(`📋 Rapport périodique envoyé : ${nouvellesInscriptions.length} nouvelle(s) inscription(s) → ${DESTINATAIRE}`);
    } else {
      console.log('🕒 Rapport périodique : aucune nouvelle inscription, envoi ignoré');
    }

    // On avance la fenêtre de 48h dans tous les cas (envoyé ou non) pour rester sur un cycle régulier
    parametre.valeur = new Date();
    await parametre.save();
  } catch (err) {
    console.error('Erreur lors du rapport périodique des participants:', err.message);
  }
}

/**
 * Démarre la vérification (toutes les heures) du rapport périodique des 48h.
 * Une vérification fréquente (et non un setInterval de 48h) permet de survivre
 * correctement à un redémarrage du serveur sans perdre le suivi de la fenêtre.
 */
function demarrerCronRapportPeriodique() {
  cron.schedule('0 * * * *', verifierEtEnvoyerRapport);
  console.log(`🕒 Cron du rapport périodique démarré (vérification toutes les heures, envoi toutes les ${INTERVALLE_HEURES}h si nouveaux participants → ${DESTINATAIRE})`);
}

module.exports = { demarrerCronRapportPeriodique, verifierEtEnvoyerRapport };

// Domaines autorisés pour les emails du personnel (sans le "@").
// Modifiable facilement ici si la liste des domaines doit évoluer.
const DOMAINES_PERSONNEL_AUTORISES = ['3s', 'globalnet'];

/**
 * Vérifie qu'un email se termine par un des domaines autorisés pour le personnel.
 * Accepte "@3s", "@3s.tn", "@globalnet", "@globalnet.com", etc.
 */
function isEmailPersonnelAutorise(email) {
  if (!email || typeof email !== 'string') return false;
  const match = email.toLowerCase().trim().match(/@([^@\s]+)$/);
  if (!match) return false;
  const domaine = match[1];
  return DOMAINES_PERSONNEL_AUTORISES.some(
    (d) => domaine === d || domaine.startsWith(`${d}.`)
  );
}

module.exports = { DOMAINES_PERSONNEL_AUTORISES, isEmailPersonnelAutorise };

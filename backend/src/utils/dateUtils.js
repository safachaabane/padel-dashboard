// Petits helpers de dates utilisés pour la logique de réservation
// (limite hebdomadaire, délai minimum, fenêtre du calendrier).

/** Minuit (00:00:00.000) pour la date donnée, sans muter l'original. */
function debutJournee(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Ajoute n jours à une date (n peut être négatif) et renvoie une nouvelle Date à minuit. */
function ajouterJours(date, n) {
  const d = debutJournee(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Lundi 00:00 de la semaine contenant `date` (semaine ISO : lundi -> dimanche).
 */
function debutSemaine(date) {
  const d = debutJournee(date);
  const jour = d.getDay(); // 0 = dimanche, 1 = lundi, ...
  const decalage = jour === 0 ? -6 : 1 - jour; // ramène au lundi
  d.setDate(d.getDate() + decalage);
  return d;
}

/** Dimanche 23:59:59.999 de la semaine contenant `date`. */
function finSemaine(date) {
  const lundi = debutSemaine(date);
  const dimanche = new Date(lundi);
  dimanche.setDate(dimanche.getDate() + 7);
  dimanche.setMilliseconds(-1);
  return dimanche;
}

/** Jour de la semaine (0=dimanche ... 6=samedi) de la date donnée. */
function jourSemaine(date) {
  return new Date(date).getDay();
}

/** Convertit "HH:MM" en minutes depuis minuit. */
function heureEnMinutes(heure) {
  const [h, m] = String(heure).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Vrai si le créneau [heureDebut, heureFin] (chaînes "HH:MM") est entièrement contenu
 * dans la plage d'ouverture [heureOuverture, heureFermeture]. Utilisé pour désactiver
 * automatiquement les créneaux hors de la plage horaire configurée pour un type.
 */
function creneauDansPlage(heureDebut, heureFin, heureOuverture, heureFermeture) {
  return (
    heureEnMinutes(heureDebut) >= heureEnMinutes(heureOuverture) &&
    heureEnMinutes(heureFin) <= heureEnMinutes(heureFermeture)
  );
}

module.exports = {
  debutJournee,
  ajouterJours,
  debutSemaine,
  finSemaine,
  jourSemaine,
  heureEnMinutes,
  creneauDansPlage,
};

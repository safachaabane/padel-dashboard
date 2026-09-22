const Parametre = require('../models/Parametre');

const REGEX_HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6]; // 0 = dimanche ... 6 = samedi (raccourci "7/7")

// Valeurs par défaut (utilisées tant que l'admin ne les a pas changées dans le dashboard).
// Chaque paramètre a un type qui détermine comment il est validé/normalisé dans setParametres.
const DEFINITIONS = {
  // Nombre de jours minimum entre aujourd'hui et la date réservable
  delaiMinJours: { type: 'nombre', defaut: 7, min: 0 },

  // Nombre de jours affichés/activables dans le calendrier de réservation
  joursCalendrierVisibles: { type: 'nombre', defaut: 15, min: 1 },

  // Nombre de réservations (équipes) autorisées par semaine, par type d'inscrit
  limiteHebdomadaireClient: { type: 'nombre', defaut: 1, min: 0 },
  limiteHebdomadairePersonnel: { type: 'nombre', defaut: 2, min: 0 },

  // Jours de la semaine ouverts au calendrier, par type (0=dimanche ... 6=samedi).
  // Raccourci "7/7" = tous les jours cochés.
  joursOuvertsClient: { type: 'joursSemaine', defaut: TOUS_LES_JOURS },
  joursOuvertsPersonnel: { type: 'joursSemaine', defaut: TOUS_LES_JOURS },

  // Plage horaire globale d'ouverture, par type : tout créneau (gabarit horaire) dont les
  // horaires sortent de cette plage est désactivé pour ce type. Raccourci "24/24" = 00:00-23:59.
  heureOuvertureClient: { type: 'heure', defaut: '00:00' },
  heureFermetureClient: { type: 'heure', defaut: '23:59' },
  heureOuverturePersonnel: { type: 'heure', defaut: '00:00' },
  heureFermeturePersonnel: { type: 'heure', defaut: '23:59' },

  // Email(s) du/des responsable(s) à notifier, par type d'inscrit (nouvelle inscription
  // en attente, annulation par le participant, etc.)
  emailsResponsableClient: { type: 'emails', defaut: [] },
  emailsResponsablePersonnel: { type: 'emails', defaut: [] },
};

const CLES_VALIDES = Object.keys(DEFINITIONS);
const DEFAUTS = Object.fromEntries(CLES_VALIDES.map((cle) => [cle, DEFINITIONS[cle].defaut]));

/** Valide/normalise une valeur brute selon le type déclaré pour `cle`. Renvoie `undefined` si invalide. */
function normaliser(cle, valeur) {
  const def = DEFINITIONS[cle];
  switch (def.type) {
    case 'nombre': {
      const nombre = Number(valeur);
      if (!Number.isFinite(nombre) || nombre < (def.min ?? -Infinity)) return undefined;
      return nombre;
    }
    case 'joursSemaine': {
      if (!Array.isArray(valeur)) return undefined;
      const jours = [...new Set(valeur.map((v) => Number(v)))].filter((v) => Number.isInteger(v) && v >= 0 && v <= 6);
      if (jours.length === 0) return undefined; // au moins un jour ouvert
      return jours.sort((a, b) => a - b);
    }
    case 'heure': {
      if (typeof valeur !== 'string' || !REGEX_HEURE.test(valeur.trim())) return undefined;
      return valeur.trim();
    }
    case 'emails': {
      if (!Array.isArray(valeur)) return undefined;
      const emails = [...new Set(valeur.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean))];
      if (emails.some((e) => !REGEX_EMAIL.test(e))) return undefined;
      return emails;
    }
    default:
      return undefined;
  }
}

/**
 * Récupère un paramètre (avec sa valeur par défaut si non configuré en base).
 */
async function getParametre(cle) {
  if (!(cle in DEFINITIONS)) throw new Error(`Paramètre inconnu: ${cle}`);
  const doc = await Parametre.findOne({ cle });
  return doc && doc.valeur !== undefined && doc.valeur !== null ? doc.valeur : DEFAUTS[cle];
}

/**
 * Récupère tous les paramètres configurables sous forme d'objet { cle: valeur }.
 */
async function getTousParametres() {
  const docs = await Parametre.find({ cle: { $in: CLES_VALIDES } });
  const valeurs = { ...DEFAUTS };
  for (const doc of docs) {
    if (doc.valeur !== undefined && doc.valeur !== null) valeurs[doc.cle] = doc.valeur;
  }
  return valeurs;
}

/**
 * Récupère uniquement les paramètres liés à la fenêtre de réservation d'un type donné
 * (délai/fenêtre communs + jours ouverts/horaires propres au type).
 */
async function getParametresPourType(type) {
  const tous = await getTousParametres();
  const suffixe = type === 'client' ? 'Client' : 'Personnel';
  return {
    delaiMinJours: tous.delaiMinJours,
    joursCalendrierVisibles: tous.joursCalendrierVisibles,
    joursOuverts: tous[`joursOuverts${suffixe}`],
    heureOuverture: tous[`heureOuverture${suffixe}`],
    heureFermeture: tous[`heureFermeture${suffixe}`],
  };
}

/**
 * Met à jour un ou plusieurs paramètres. `maj` est un objet partiel { cle: valeur }.
 * Les clés inconnues ou les valeurs invalides pour leur type sont ignorées silencieusement.
 */
async function setParametres(maj) {
  const entrees = Object.entries(maj || {}).filter(([cle]) => CLES_VALIDES.includes(cle));
  for (const [cle, valeurBrute] of entrees) {
    const valeur = normaliser(cle, valeurBrute);
    if (valeur === undefined) continue;
    await Parametre.findOneAndUpdate(
      { cle },
      { $set: { valeur } },
      { upsert: true }
    );
  }
  return getTousParametres();
}

module.exports = {
  DEFAUTS,
  CLES_VALIDES,
  TOUS_LES_JOURS,
  getParametre,
  getTousParametres,
  getParametresPourType,
  setParametres,
};

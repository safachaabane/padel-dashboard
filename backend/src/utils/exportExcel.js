const ExcelJS = require('exceljs');

const libelleStatut = (s) => ({ en_attente: 'En attente', confirme: 'Confirmée', re_reserve: 'Re-réservé', annule: 'Annulée' }[s] || s);

const libelleSatisfaction = (entree) => {
  if (!entree) return '—';
  if (!entree.envoye) return "Email non envoyé (créneau pas encore terminé)";
  if (!entree.repondu) return 'Envoyé, en attente de réponse';
  return `${entree.note}/5${entree.commentaire ? ' — ' + entree.commentaire : ''}`;
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');
const formatDateHeure = (d) => (d ? new Date(d).toLocaleString('fr-FR') : '');

// Catalogue des champs exportables : id (stable, utilisé par le frontend pour la sélection),
// libellé affiché, groupe (pour organiser les cases à cocher), et fonction d'extraction de la valeur.
const CHAMPS_EXPORT = [
  { id: 'typeInscrit', label: 'Type', groupe: 'Inscription', valeur: (i) => (i.typeInscrit === 'client' ? 'Client' : 'Personnel') },
  { id: 'nomComplet', label: 'Nom complet', groupe: 'Inscription', valeur: (i) => i.nomComplet },
  { id: 'societe', label: 'Société', groupe: 'Inscription', valeur: (i) => i.societe || '' },
  { id: 'email', label: 'Email', groupe: 'Inscription', valeur: (i) => i.email },
  { id: 'telephone', label: 'Téléphone', groupe: 'Inscription', valeur: (i) => i.telephone },
  { id: 'statut', label: 'Statut', groupe: 'Inscription', valeur: (i) => libelleStatut(i.statut) },
  { id: 'confirme', label: 'Email de validation envoyé', groupe: 'Inscription', valeur: (i) => (i.confirme ? 'Oui' : 'Non') },
  { id: 'dateConfirmation', label: 'Date de validation', groupe: 'Inscription', valeur: (i) => formatDateHeure(i.dateConfirmation) },
  { id: 'ipAddress', label: 'Adresse IP', groupe: 'Inscription', valeur: (i) => i.ipAddress || '' },
  { id: 'annulePar', label: 'Annulée par', groupe: 'Inscription', valeur: (i) => (i.annulePar === 'participant' ? 'Le participant' : i.annulePar === 'admin' ? 'Un administrateur' : '') },
  { id: 'dateAnnulation', label: "Date d'annulation", groupe: 'Inscription', valeur: (i) => formatDateHeure(i.dateAnnulation) },
  { id: 'createdAt', label: "Date d'inscription", groupe: 'Inscription', valeur: (i) => formatDateHeure(i.createdAt) },

  { id: 'creneauDate', label: 'Date du créneau', groupe: 'Créneau', valeur: (i) => formatDate(i.date) },
  { id: 'creneauHeure', label: 'Horaire', groupe: 'Créneau', valeur: (i) => (i.creneau ? `${i.creneau.heureDebut} - ${i.creneau.heureFin}` : '') },
  { id: 'creneauType', label: 'Type de créneau', groupe: 'Créneau', valeur: (i) => i.creneau?.type || '' },

  { id: 'invite1Nom', label: 'Invité 1 - Nom', groupe: 'Invités', valeur: (i) => i.invites?.[0]?.nom || '' },
  { id: 'invite1Email', label: 'Invité 1 - Email', groupe: 'Invités', valeur: (i) => i.invites?.[0]?.email || '' },
  { id: 'invite2Nom', label: 'Invité 2 - Nom', groupe: 'Invités', valeur: (i) => i.invites?.[1]?.nom || '' },
  { id: 'invite2Email', label: 'Invité 2 - Email', groupe: 'Invités', valeur: (i) => i.invites?.[1]?.email || '' },
  { id: 'invite3Nom', label: 'Invité 3 - Nom', groupe: 'Invités', valeur: (i) => i.invites?.[2]?.nom || '' },
  { id: 'invite3Email', label: 'Invité 3 - Email', groupe: 'Invités', valeur: (i) => i.invites?.[2]?.email || '' },

  {
    id: 'satisfactionParticipant', label: 'Satisfaction - Participant', groupe: 'Satisfaction',
    valeur: (i) => libelleSatisfaction(i.satisfaction?.find((s) => s.role === 'participant')),
  },
  {
    id: 'satisfactionInvite1', label: 'Satisfaction - Invité 1', groupe: 'Satisfaction',
    valeur: (i) => libelleSatisfaction(i.satisfaction?.find((s) => s.role === 'invite' && s.email === i.invites?.[0]?.email)),
  },
  {
    id: 'satisfactionInvite2', label: 'Satisfaction - Invité 2', groupe: 'Satisfaction',
    valeur: (i) => libelleSatisfaction(i.satisfaction?.find((s) => s.role === 'invite' && s.email === i.invites?.[1]?.email)),
  },
  {
    id: 'satisfactionInvite3', label: 'Satisfaction - Invité 3', groupe: 'Satisfaction',
    valeur: (i) => libelleSatisfaction(i.satisfaction?.find((s) => s.role === 'invite' && s.email === i.invites?.[2]?.email)),
  },
];

/**
 * Génère un classeur Excel à partir d'une liste d'inscriptions (déjà populées avec leur créneau)
 * et d'une liste d'ids de champs à inclure (dans l'ordre du catalogue). Si aucun champ n'est
 * fourni, tous les champs du catalogue sont utilisés.
 */
async function genererClasseurInscriptions(inscriptions, champsIds) {
  const idsValides = Array.isArray(champsIds) && champsIds.length > 0 ? champsIds : CHAMPS_EXPORT.map((c) => c.id);
  const colonnes = CHAMPS_EXPORT.filter((c) => idsValides.includes(c.id));
  const colonnesFinales = colonnes.length > 0 ? colonnes : CHAMPS_EXPORT;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Padel Club';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Inscriptions');
  sheet.columns = colonnesFinales.map((c) => ({ header: c.label, key: c.id, width: Math.max(c.label.length + 4, 18) }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A472A' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;

  inscriptions.forEach((ins) => {
    const ligne = {};
    colonnesFinales.forEach((c) => { ligne[c.id] = c.valeur(ins); });
    const row = sheet.addRow(ligne);
    row.font = { name: 'Arial', size: 10.5 };
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnesFinales.length } };

  return workbook;
}

module.exports = { CHAMPS_EXPORT, genererClasseurInscriptions };

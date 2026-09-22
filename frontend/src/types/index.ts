// Un créneau est un gabarit horaire réutilisable chaque jour (ex: 09:00-10:30),
// il n'est plus lié à une date précise. La date est choisie séparément par
// l'utilisateur (voir Inscription.date) dans le calendrier du formulaire.
export interface Creneau {
  _id: string;
  heureDebut: string;
  heureFin: string;
  nombrePlaces: number;
  type: "client" | "personnel" | "mixte";
  actif: boolean;
  createdAt: string;
}

// Disponibilité calculée d'un créneau pour une date précise (renvoyée par
// GET /creneaux/disponibilites)
export interface CreneauDisponibilite extends Creneau {
  placesRestantes: number;
  complet: boolean;
}

export interface QuotaHebdomadaire {
  limite: number;
  utilisees: number;
  atteint: boolean;
}

export interface DisponibilitesReponse {
  date: string;
  quotaHebdomadaire: QuotaHebdomadaire;
  creneaux: CreneauDisponibilite[];
}

// Paramètres publics communs, utilisés par le calendrier de réservation
export interface ParametresPublics {
  delaiMinJours: number;
  joursCalendrierVisibles: number;
}

// Paramètres publics propres à un type (client OU personnel) : jours de la semaine
// ouverts au calendrier (0=dimanche ... 6=samedi) et plage horaire globale.
export interface ParametresPublicsType extends ParametresPublics {
  joursOuverts: number[];
  heureOuverture: string; // "HH:MM"
  heureFermeture: string; // "HH:MM"
}

// Tous les paramètres configurables (vue admin / dashboard)
export interface ParametresAdmin extends ParametresPublics {
  limiteHebdomadaireClient: number;
  limiteHebdomadairePersonnel: number;

  joursOuvertsClient: number[];
  joursOuvertsPersonnel: number[];
  heureOuvertureClient: string;
  heureFermetureClient: string;
  heureOuverturePersonnel: string;
  heureFermeturePersonnel: string;

  emailsResponsableClient: string[];
  emailsResponsablePersonnel: string[];
}

// Libellés + valeurs des 7 jours de la semaine (0=dimanche ... 6=samedi, convention JS Date#getDay)
export const JOURS_SEMAINE: { valeur: number; label: string; court: string }[] = [
  { valeur: 1, label: 'Lundi', court: 'Lun' },
  { valeur: 2, label: 'Mardi', court: 'Mar' },
  { valeur: 3, label: 'Mercredi', court: 'Mer' },
  { valeur: 4, label: 'Jeudi', court: 'Jeu' },
  { valeur: 5, label: 'Vendredi', court: 'Ven' },
  { valeur: 6, label: 'Samedi', court: 'Sam' },
  { valeur: 0, label: 'Dimanche', court: 'Dim' },
];

// Un coéquipier invité par le participant principal (équipe de padel = 4 joueurs).
// Le nom est obligatoire, l'email est optionnel.
export interface Invite {
  nom: string;
  email?: string;
}

export interface SatisfactionEntree {
  role: "participant" | "invite";
  nom: string;
  email: string;
  envoye: boolean;
  dateEnvoi?: string;
  repondu: boolean;
  note?: number;
  commentaire?: string;
  dateReponse?: string;
}

export type StatutInscription = "en_attente" | "confirme" | "re_reserve" | "annule";

export interface Inscription {
  _id: string;
  typeInscrit: "client" | "personnel";
  nomComplet: string;
  telephone: string;
  email: string;
  societe?: string;
  invites: Invite[];
  creneau: Creneau | string;
  date: string;
  ipAddress?: string;
  confirme: boolean;
  dateConfirmation?: string;
  statut: StatutInscription;
  dateAnnulation?: string;
  annulePar?: "participant" | "admin";
  dateReReservation?: string;
  satisfaction?: SatisfactionEntree[];
  createdAt: string;
}

export type AdminRole = "super_admin" | "admin_clients" | "admin_personnel";

export interface Admin {
  id: string;
  email: string;
  nom: string;
  role: AdminRole;
}

export interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
}

export interface DashboardStats {
  creneaux: { total: number; actifs: number };
  inscriptions: {
    total: number;
    confirmees: number;
    enAttente: number;
    reReservees: number;
    annulees: number;
    clients: number;
    personnel: number;
  };
  inscriptionsRecentes: Inscription[];
  prochainsCreneaux: Inscription[];
}

// Formulaire inscription (3 étapes) — 1) créneau, 2) infos perso, 3) les 3 coéquipiers (équipe de 4)
export interface FormClientData {
  nomComplet: string;
  telephone: string;
  email: string;
  societe: string;
  invites: Invite[];
  date: string;
}

export interface FormPersonnelData {
  nomComplet: string;
  telephone: string;
  email: string;
  invites: Invite[];
  date: string;
}

// Catalogue des champs disponibles pour l'export Excel (renvoyé par le backend)
export interface ChampExport {
  id: string;
  label: string;
  groupe: string;
}

// Espace public "Ma réservation" (accès par jeton, sans compte)
export interface MaReservation {
  nomComplet: string;
  typeInscrit: "client" | "personnel";
  societe?: string;
  invites: Invite[];
  date: string;
  creneau: { heureDebut: string; heureFin: string } | null;
  statut: StatutInscription;
  peutAnnuler: boolean;
  doitReReserver: boolean;
}

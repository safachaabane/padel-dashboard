# 🎾 Padel Club – Application de gestion des créneaux

Application complète avec :
- **Backend** : Express.js + MongoDB (Mongoose)
- **Frontend** : React + Vite + TypeScript
- **Email** : Nodemailer (confirmation d'inscription)

---

## 📁 Structure du projet

```
padel-app/
├── backend/          → API Express.js
│   ├── src/
│   │   ├── index.js
│   │   ├── models/   → Admin, Creneau, Inscription
│   │   ├── routes/   → auth, creneaux, inscriptions, admin
│   │   ├── middleware/ → auth JWT
│   │   └── utils/    → email, seed
│   └── .env.example
└── frontend/         → React Vite TypeScript
    └── src/
        ├── pages/
        │   ├── FormClientPage.tsx       → /inscription/client
        │   ├── FormPersonnelPage.tsx    → /inscription/personnel
        │   ├── SuccessPage.tsx          → après soumission
        │   ├── ConfirmationPage.tsx     → /confirmation/:token
        │   └── admin/
        │       ├── LoginPage.tsx        → /admin/login
        │       ├── DashboardPage.tsx    → /admin/dashboard
        │       ├── CreneauxPage.tsx     → /admin/creneaux
        │       └── InscriptionsPage.tsx → /admin/inscriptions
        ├── components/
        │   ├── admin/AdminLayout.tsx
        │   ├── forms/CreneauSelector.tsx
        │   └── shared/ProtectedRoute.tsx
        └── hooks/useAuth.tsx
```

---

## 🚀 Installation & démarrage

### 1. MongoDB
Assurez-vous que MongoDB est lancé localement sur le port 27017, ou utilisez MongoDB Atlas et modifiez `MONGODB_URI` dans `.env`.

### 2. Backend
```bash
cd backend
cp .env.example .env
# Éditez .env avec vos valeurs (SMTP, JWT_SECRET, etc.)
npm install
npm run dev
```
Le serveur démarre sur `http://localhost:5000`.

**Admin créé automatiquement au démarrage :**
- Email : `admin@padel.com`
- Mot de passe : `Admin@123`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
L'application est accessible sur `http://localhost:5173`.

---

## 🔗 URLs

| URL | Description |
|-----|-------------|
| `http://localhost:5173/inscription/client` | Formulaire inscription **Client** |
| `http://localhost:5173/inscription/personnel` | Formulaire inscription **Personnel** |
| `http://localhost:5173/admin/login` | Connexion admin |
| `http://localhost:5173/admin/dashboard` | Tableau de bord |
| `http://localhost:5173/admin/creneaux` | Gestion des créneaux |
| `http://localhost:5173/admin/inscriptions` | Liste des inscriptions |

---

## ⚙️ Fonctionnalités

### Admin
- ✅ Authentification JWT sécurisée
- ✅ Tableau de bord avec statistiques en temps réel
- ✅ CRUD complet des créneaux (date, horaire, places, type, limitation jours)
- ✅ Liste et filtrage des inscriptions
- ✅ Changement de statut (en attente / confirmé / annulé)

### Formulaires publics
- ✅ Formulaire Client : nom, prénom, tel, email, **code contrat**, créneau
- ✅ Formulaire Personnel : nom, prénom, tel, email, créneau
- ✅ Créneaux complets désactivés (visibles mais non cliquables)
- ✅ Barre de remplissage des places
- ✅ Filtrage automatique par type (client/personnel/mixte)
- ✅ **Règle de limitation** : blocage si déjà inscrit dans les N derniers jours

### Emails
- ✅ Email HTML de confirmation envoyé à l'inscription
- ✅ Lien de confirmation unique par inscription
- ✅ Page de confirmation (`/confirmation/:token`)

---

## 🔧 Configuration email (Gmail)

1. Activez la **validation en 2 étapes** sur votre compte Google
2. Créez un **mot de passe d'application** (sécurité → mots de passe d'application)
3. Renseignez dans `.env` :
```env
SMTP_USER=votre@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # mot de passe d'application (sans espaces)
```

---

## 🏗️ Variables d'environnement backend

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/padel-app
JWT_SECRET=changez_ce_secret_en_production
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@gmail.com
SMTP_PASS=votre_app_password
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@padel.com
ADMIN_PASSWORD=Admin@123
```

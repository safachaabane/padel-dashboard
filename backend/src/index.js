require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const creneauRoutes = require("./routes/creneaux");
const inscriptionRoutes = require("./routes/inscriptions");
const adminRoutes = require("./routes/admin");
const satisfactionRoutes = require("./routes/satisfaction");
const parametresRoutes = require("./routes/parametres");
const mesReservationsRoutes = require("./routes/mesReservations");
const { seedAdmin } = require("./utils/seed");
const { demarrerCronSatisfaction } = require("./utils/satisfactionCron");
const {
  demarrerCronRapportPeriodique,
} = require("./utils/rapportPeriodiqueCron");

const app = express();

// Permet de récupérer la vraie IP du visiteur si l'app est derrière un proxy/load-balancer
// (utile pour la règle anti-doublon des 15 jours basée notamment sur l'IP)
app.set("trust proxy", true);

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/creneaux", creneauRoutes);
app.use("/api/inscriptions", inscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/satisfaction", satisfactionRoutes);
app.use("/api/parametres", parametresRoutes);
app.use("/api/mes-reservations", mesReservationsRoutes);

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "OK", timestamp: new Date() })
);

// Connect MongoDB & start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/padel-app")
  .then(async () => {
    console.log("✅ MongoDB connecté");
    await seedAdmin();
    demarrerCronSatisfaction();
    demarrerCronRapportPeriodique();
    app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Erreur MongoDB:", err.message);
    process.exit(1);
  });

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",

  ...(process.env.SMTP_AUTH === "true"
    ? {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {}),
});
// Infos Wi-Fi du club, affichées dans le mail de validation (à configurer dans .env)
const WIFI_SSID = process.env.WIFI_SSID || "PadelClub-Guest";
// const WIFI_PASSWORD = process.env.WIFI_PASSWORD || "Disponible à l'accueil";
const ADRESSE = "7 Rue de l'Artisanat, Charguia 2, Tunis 2035";
const LIEN_MAPS = "https://maps.app.goo.gl/gZWBtfNY1QVpbkccA";
const formaterDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Squelette HTML commun à tous les emails (même charte graphique que l'email d'origine)

const enveloppeHtml = ({ sousTitreHeader, contenu }) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel Society</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
  <tr>
    <td align="center" style="padding:20px 10px;">

      <table width="600" cellpadding="0" cellspacing="0" border="0"
             bgcolor="#ffffff"
             style="border-collapse:collapse;">

        <!-- HEADER -->
        <tr>
          <td align="center"
              bgcolor="#ff6700"
              style="padding:35px 20px;">

            <div style="
              color:#ffffff;
              font-size:30px;
              font-weight:bold;
              line-height:36px;">
              Padel Society GlobalNet
            </div>

            <div style="
              color:#ffe2cc;
              font-size:16px;
              padding-top:10px;">
              ${sousTitreHeader}
            </div>

          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="
            padding:30px;
            color:#333333;
            font-size:16px;
            line-height:24px;">

            ${contenu}

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center"
              bgcolor="#f7f7f7"
              style="
                padding:20px;
                color:#888888;
                font-size:13px;
                line-height:20px;">
            © ${new Date().getFullYear()} Padel Society • GlobalNet
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`;

/**
 * Email envoyé immédiatement après l'inscription (participant uniquement) :
 * accuse réception et précise que l'inscription est en attente de validation par l'administration.
 */
const sendInscriptionRecueEmail = async ({
  to,
  nom,
  prenom,
  creneau,
  date,
  typeInscrit,
}) => {
  const dateFormatee = formaterDate(date);

  const contenu = `
<h2 style="margin-top:0;color:#222;">
  Bonjour ${prenom} ${nom},
</h2>

<p>
  Votre inscription a bien été reçue.
</p>

<p>
  Elle est actuellement <strong>en attente de validation</strong>.
  Vous recevrez un nouvel email dès que votre créneau sera confirmé.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="
         background:#fff2e8;
         border-left:4px solid #ff6700;
         margin-top:20px;
         margin-bottom:20px;">
  <tr>
    <td style="padding:20px;">

      <p><strong>📅 Date :</strong> ${dateFormatee}</p>

      <p><strong>🕐 Horaire :</strong>
      ${creneau.heureDebut} – ${creneau.heureFin}</p>

      <p><strong>📍 Localisation :</strong>
      ${ADRESSE}</p>

      <p>
        <a href="${LIEN_MAPS}"
           style="
             color:#ff6700;
             text-decoration:none;
             font-weight:bold;">
          Voir sur la carte →
        </a>
      </p>

    </td>
  </tr>
</table>

<p style="font-size:13px;color:#888;">
  Si vous n'avez pas effectué cette demande, ignorez cet email.
</p>
`;

  await transporter.sendMail({
    from: `"Padel Society GlobalNet" <${process.env.SMTP_USER}>`,
    to,
    subject: `📨 Inscription reçue – en attente de validation (créneau du ${dateFormatee})`,
    html: enveloppeHtml({ sousTitreHeader: "Inscription reçue", contenu }),
  });
};

/**
 * Email envoyé lorsqu'un administrateur valide l'inscription (un par un ou en lot).
 * Envoyé au participant principal ET à chacun de ses 3 invités, avec tous les détails
 * du créneau ainsi que les informations Wi-Fi du club.
 */
const sendValidationEmail = async ({
  to,
  nomComplet,
  creneau,
  date,
  typeInscrit,
  estInvite,
  inviteurNomComplet,
  tokenGestion,
}) => {
  const dateFormatee = formaterDate(date);
  const lienGestion = tokenGestion
    ? `${process.env.FRONTEND_URL}/ma-reservation/${tokenGestion}`
    : null;

  const contenu = `
    <br><h2>Bonjour ${nomComplet},</h2>
    ${
      estInvite
        ? `<p>Vous avez été invité(e) par <strong>${inviteurNomComplet}</strong> à rejoindre son équipe pour un match de padel. Cette inscription vient d'être <strong>confirmée</strong> !</p>`
        : `<p>Vous etes inscrit(e) au  match de padel. </p>`
    }
    <p>Voici le détail de votre créneau :</p><br>
   <table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#fff2e8;border-left:4px solid #ff6700;">
  <tr>
    <td style="padding:20px;">
      <p><strong>📅 Date :</strong> ${dateFormatee}</p>
      <p><strong>🕐 Horaire :</strong> ${creneau.heureDebut} – ${
    creneau.heureFin
  }</p>
      <p><strong>📍 Localisation :</strong> ${ADRESSE}</p>
      <p>
        <a href="${LIEN_MAPS}"
           style="color:#ff6700;text-decoration:none;font-weight:bold;">
          Voir sur la carte →
        </a>
      </p>
    </td>
  </tr>
</table>

<br>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#eef6ff;border-left:4px solid #1e4471;">
  <tr>
    <td style="padding:20px;">
      <p><strong>📶 Wi-Fi disponible sur place</strong></p>
      <p><strong>Réseau :</strong> ${WIFI_SSID}</p>
    </td>
  </tr>
</table>
    <br>
    <p>Merci de vous présenter quelques minutes avant le début du créneau. À très vite sur le court !</p>
    ${
      !estInvite && lienGestion
        ? `<p>Besoin d'annuler ? Vous pouvez gérer votre réservation ici (annulation possible jusqu'à 48h avant) :
             <br><a href="${lienGestion}" style="color:#ff6700;font-weight:bold;">Gérer ma réservation →</a></p>`
        : ""
    }
      <p style="color:#888; font-size:13px;">L'equipe GlobalNet</p>
      <br>

  `;

  await transporter.sendMail({
    from: `"Padel Society GlobalNet" <${process.env.SMTP_USER}>`,
    to,
    subject: `✅ Votre match de Padel est confirmé – ${dateFormatee}`,
    html: enveloppeHtml({ sousTitreHeader: "Inscription confirmée", contenu }),
  });
};

/**
 * Email envoyé au(x) responsable(s) (configuré(s) dans les paramètres, par type
 * client/personnel) dès qu'une nouvelle inscription arrive, pour les inviter à la valider.
 */
const sendNouvelleInscriptionResponsableEmail = async ({
  to,
  nomComplet,
  typeInscrit,
  creneau,
  date,
  societe,
}) => {
  const dateFormatee = formaterDate(date);
  const libelleType = typeInscrit === "client" ? "client" : "personnel";

  const contenu = `
    <h2 style="margin-top:0;color:#222;">Nouvelle inscription en attente</h2>
    <p>
      <strong>${nomComplet}</strong>${
    societe ? ` (${societe})` : ""
  } vient de s'inscrire
      en tant que <strong>${libelleType}</strong> et attend votre confirmation.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#fff2e8;border-left:4px solid #ff6700;margin-top:16px;">
      <tr>
        <td style="padding:20px;">
          <p><strong>📅 Date :</strong> ${dateFormatee}</p>
          <p><strong>🕐 Horaire :</strong> ${creneau.heureDebut} – ${
    creneau.heureFin
  }</p>
        </td>
      </tr>
    </table>
    <p style="margin-top:16px;">Merci de vous rendre sur le tableau de bord pour confirmer ou refuser cette inscription.</p>
    <p style="color:#888; font-size:13px;">L'equipe GlobalNet</p>
  `;

  await transporter.sendMail({
    from: `"Padel Society GlobalNet" <${process.env.SMTP_USER}>`,
    to,
    subject: `🔔 Nouvelle inscription ${libelleType} en attente de confirmation`,
    html: enveloppeHtml({ sousTitreHeader: "Nouvelle inscription", contenu }),
  });
};

/**
 * Email envoyé au participant lorsqu'un admin bascule son inscription (déjà confirmée)
 * vers le statut "re_reserve" : sa date n'est finalement plus disponible, il doit
 * en choisir une nouvelle depuis son espace "Ma réservation" (données déjà conservées).
 */
const sendReReserverEmail = async ({
  to,
  nomComplet,
  creneau,
  date,
  tokenGestion,
}) => {
  const dateFormatee = formaterDate(date);
  const lienGestion = `${process.env.FRONTEND_URL}/ma-reservation/${tokenGestion}`;

  const contenu = `
    <h2 style="margin-top:0;color:#222;">Bonjour ${nomComplet},</h2>
    <p>
      Votre créneau du <strong>${dateFormatee}</strong> (${creneau.heureDebut} – ${creneau.heureFin})
      n'est finalement plus disponible.
    </p>
    <p>Vos informations sont conservées : il vous suffit de choisir un nouveau créneau, sans tout ressaisir.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
      <tr>
        <td bgcolor="#ff6700" align="center" style="padding:14px 28px;">
          <a href="${lienGestion}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
            📅 Choisir un nouveau créneau
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#888; font-size:13px;margin-top:16px;">L'equipe GlobalNet</p>
  `;

  await transporter.sendMail({
    from: `"Padel Society GlobalNet" <${process.env.SMTP_USER}>`,
    to,
    subject: `📅 Merci de choisir un nouveau créneau (ancien créneau du ${dateFormatee} indisponible)`,
    html: enveloppeHtml({
      sousTitreHeader: "Nouvelle réservation nécessaire",
      contenu,
    }),
  });
};

/**
 * Email envoyé au(x) responsable(s) du type concerné lorsqu'un participant annule
 * lui-même sa réservation depuis son espace "Ma réservation".
 */
const sendAnnulationResponsableEmail = async ({
  to,
  nomComplet,
  typeInscrit,
  creneau,
  date,
}) => {
  const dateFormatee = formaterDate(date);
  const libelleType = typeInscrit === "client" ? "client" : "personnel";

  const contenu = `
    <h2 style="margin-top:0;color:#222;">Annulation d'une réservation</h2>
    <p>
      <strong>${nomComplet}</strong> (${libelleType}) vient d'annuler sa réservation du
      <strong>${dateFormatee}</strong> (${creneau.heureDebut} – ${creneau.heureFin}).
    </p>
    <p style="color:#888; font-size:13px;">L'equipe GlobalNet</p>
  `;

  await transporter.sendMail({
    from: `"Padel Society GlobalNet" <${process.env.SMTP_USER}>`,
    to,
    subject: `❌ Annulation – ${nomComplet} (${libelleType})`,
    html: enveloppeHtml({ sousTitreHeader: "Réservation annulée", contenu }),
  });
};

/**
 * Email de satisfaction envoyé après la fin du créneau (participant + chaque invité),
 * avec un bouton menant vers un mini-formulaire pré-rempli pour donner son avis.
 */
const sendSatisfactionEmail = async ({ to, nom, creneau, date, token }) => {
  const dateFormatee = formaterDate(date);
  const lienSatisfaction = `${process.env.FRONTEND_URL}/satisfaction/${token}`;

  const contenu = `
    <h2>Bonjour ${nom},</h2>
    <p>Vous avez joué au padel le <strong>${dateFormatee}</strong>.</p>
    <p>Votre avis est précieux! Prenez quelques secondes pour nous partager votre expérience.</p>
<table cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td bgcolor="#ff6700"
        align="center"
        style="padding:14px 28px;">
      <a href="${lienSatisfaction}"
         style="
           color:#ffffff;
           text-decoration:none;
           font-size:16px;
           font-weight:bold;">
        ⭐ Donner mon avis
      </a>
    </td>
  </tr>
</table>   

    <p style="color:#888; font-size:13px;">Ce lien est personnel et ne peut être utilisé qu'une seule fois.</p>
         <p style="color:#888; font-size:13px;">L'equipe GlobalNet</p>
    <br>
  `;

  await transporter.sendMail({
    from: `"Padel Society GlobalNet" <${process.env.SMTP_USER}>`,
    to,
    subject: "🎾 Votre avis compte ! Comment s'est passée votre match?",
    html: enveloppeHtml({
      sousTitreHeader: "Enquête de satisfaction",
      contenu,
      gradient: "linear-gradient(135deg, #1e4471, #2d6a4f)",
    }),
  });
};

module.exports = {
  sendInscriptionRecueEmail,
  sendValidationEmail,
  sendSatisfactionEmail,
  sendNouvelleInscriptionResponsableEmail,
  sendReReserverEmail,
  sendAnnulationResponsableEmail,
};

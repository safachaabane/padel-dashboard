import { MapPin, Users, Wifi, Clock } from "lucide-react";

interface Props {
  typeInscrit: "client" | "personnel";
}

const ADRESSE = "7 Rue de l'Artisanat, Charguia 2, Tunis 2035";
const LIEN_MAPS = "https://maps.app.goo.gl/gZWBtfNY1QVpbkccA";

export default function RegistrationPoster({ typeInscrit }: Props) {
  return (
    <div className="poster-hero">
      <div className="poster-partner">
        <img src="/assets/logo-padel-society.png" alt="Padel Society" />
        <span>En partenariat avec</span>{" "}
        <img src="/assets/logo-gnet.png" alt="GlobalNet" />
      </div>

      <h1>Réservez votre créneau de Padel</h1>
      {/* <p className="poster-subtitle">
        {typeInscrit === "client"
          ? "Inscription en ligne réservée aux clients"
          : "Inscription en ligne réservée au personnel"}
      </p> */}
      {/* <div className="badge-type">
        {typeInscrit === "client" ? "🧑 Espace Client" : "👷 Espace Personnel"}
      </div> */}

      <div className="poster-info-card">
        <div className="poster-info-item">
          <span className="icon-badge">
            <MapPin size={17} />
          </span>
          <div>
            <strong>Padel Society</strong>
            <p>{ADRESSE}</p>
            <a href={LIEN_MAPS} target="_blank" rel="noopener noreferrer">
              Voir sur la carte →
            </a>
          </div>
        </div>

        <div className="poster-info-item">
          <span className="icon-badge">
            <Users size={17} />
          </span>
          <div>
            <strong>Équipe de 4 joueurs</strong>
            <p>Invitez 3 de vous coéquipiers</p>
          </div>
        </div>

        <div className="poster-info-item">
          <span className="icon-badge">
            <Wifi size={17} />
          </span>
          <div>
            <strong>Free Wi-Fi</strong>
            <p>Internet fibre GlobalNet illimité</p>
          </div>
        </div>
      </div>
    </div>
  );
}

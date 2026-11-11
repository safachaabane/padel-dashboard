import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ClipboardList,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Star,
  Building2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../utils/api";
import { Inscription, Creneau, SatisfactionEntree } from "../../types";
import ExportExcelModal from "../../components/admin/ExportExcelModal";

type StatutFilter = "" | "en_attente" | "confirme" | "re_reserve" | "annule";
type TypeFilter = "" | "client" | "personnel";

function BlocSatisfaction({ entree }: { entree?: SatisfactionEntree }) {
  if (!entree)
    return (
      <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>—</span>
    );
  if (!entree.envoye)
    return (
      <span className="badge badge-yellow" style={{ fontSize: ".72rem" }}>
        Pas encore envoyé
      </span>
    );
  if (!entree.repondu)
    return (
      <span className="badge badge-blue" style={{ fontSize: ".72rem" }}>
        Envoyé, en attente de réponse
      </span>
    );
  return (
    <div style={{ fontSize: ".82rem" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontWeight: 700,
          color: "var(--green-700)",
        }}
      >
        <Star size={13} fill="currentColor" /> {entree.note}/5
      </span>
      {entree.commentaire && (
        <div
          style={{
            color: "var(--text-secondary)",
            marginTop: 2,
            fontStyle: "italic",
          }}
        >
          « {entree.commentaire} »
        </div>
      )}
    </div>
  );
}

export default function DetailsInscriptionsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutFilter>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = () => {
    const params: Record<string, string> = {};
    if (statutFilter) params.statut = statutFilter;
    if (typeFilter) params.typeInscrit = typeFilter;

    api
      .get("/inscriptions", { params })
      .then((r) => setInscriptions(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setSelectedIds(new Set());
    load();
  }, [statutFilter, typeFilter]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSupprimer = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette inscription ?")) return;
    try {
      await api.delete(`/inscriptions/${id}`);
      toast.success("Inscription supprimée");
      setInscriptions((prev) => prev.filter((i) => i._id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la suppression"
      );
    }
  };

  const handleSupprimerSelection = async () => {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `Supprimer définitivement ${selectedIds.size} inscription(s) ?`
      )
    )
      return;
    setBulkLoading(true);
    try {
      const { data } = await api.delete("/inscriptions/bulk/supprimer", {
        data: { ids: Array.from(selectedIds) },
      });
      toast.success(data.message);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la suppression"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const statutBadge = (s: string) => {
    if (s === "confirme")
      return <span className="badge badge-green">✓ Confirmée</span>;
    if (s === "en_attente")
      return <span className="badge badge-yellow">⏳ En attente</span>;
    if (s === "re_reserve")
      return <span className="badge badge-blue">📅 Réserver à nouveau</span>;
    return <span className="badge badge-red">✕ Annulée</span>;
  };

  const filtered = inscriptions.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.nomComplet.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.telephone || "").includes(q) ||
      (i.societe || "").toLowerCase().includes(q) ||
      (i.invites || []).some(
        (inv) =>
          inv.nom.toLowerCase().includes(q) ||
          (inv.email || "").toLowerCase().includes(q)
      )
    );
  });

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i._id));
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allSel =
        filtered.length > 0 && filtered.every((i) => prev.has(i._id));
      return allSel ? new Set() : new Set(filtered.map((i) => i._id));
    });
  };

  return (
    <div>
      <h1 className="page-title">Détails complets des inscriptions</h1>
      <p className="page-subtitle">
        Toutes les inscriptions, leurs invités et leur satisfaction, avec export
        Excel personnalisable
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Rechercher par nom, email, téléphone, coéquipier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select
            className="form-select"
            style={{ width: "auto" }}
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as StatutFilter)}
          >
            <option value="">Tous statuts</option>
            <option value="en_attente">En attente</option>
            <option value="confirme">Confirmées</option>
            <option value="re_reserve">Réservées à nouveau</option>
            <option value="annule">Annulées</option>
          </select>

          <select
            className="form-select"
            style={{ width: "auto" }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="">Tous types</option>
            <option value="client">Clients</option>
            <option value="personnel">Personnel</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowExport(true)}
          style={{ fontSize: ".85rem", padding: "8px 16px" }}
        >
          <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
          Exporter en Excel
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: ".8rem",
            color: "var(--text-muted)",
          }}
        >
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAllVisible}
            disabled={filtered.length === 0}
          />
          Tout sélectionner
        </label>
        <button
          className="btn btn-danger"
          disabled={selectedIds.size === 0 || bulkLoading}
          onClick={handleSupprimerSelection}
          style={{ fontSize: ".85rem", padding: "8px 16px" }}
        >
          <Trash2 size={15} style={{ marginRight: 6 }} />
          Supprimer la sélection ({selectedIds.size})
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} />
            <h3>Aucune inscription</h3>
            <p>Modifiez les filtres ou attendez les premières inscriptions.</p>
          </div>
        ) : (
          filtered.map((ins) => {
            const cr = ins.creneau as Creneau;
            const isOpen = expanded.has(ins._id);
            const satisfactionParticipant = ins.satisfaction?.find(
              (s) => s.role === "participant"
            );

            return (
              <div
                key={ins._id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {/* Ligne résumé */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(ins._id)}
                    onChange={() => toggleSelect(ins._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    onClick={() => toggleExpand(ins._id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flex: 1,
                      minWidth: 240,
                      cursor: "pointer",
                    }}
                  >
                    {isOpen ? (
                      <ChevronUp
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 700 }}>{ins.nomComplet}</div>
                      {ins.societe && (
                        <div
                          style={{
                            fontSize: ".78rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          🏢 {ins.societe}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: ".78rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {ins.email} · {ins.telephone}
                      </div>
                    </div>
                  </div>

                  {ins.typeInscrit === "client" ? (
                    <span className="badge badge-blue">🧑 Client</span>
                  ) : (
                    <span className="badge badge-green">👷 Personnel</span>
                  )}

                  <div style={{ fontSize: ".85rem", minWidth: 150 }}>
                    {cr && typeof cr === "object" ? (
                      <>
                        <div style={{ fontWeight: 500 }}>
                          {format(new Date(ins.date), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: ".75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {cr.heureDebut}–{cr.heureFin}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>

                  {statutBadge(ins.statut)}

                  <div style={{ minWidth: 90 }}>
                    <BlocSatisfaction entree={satisfactionParticipant} />
                  </div>

                  <button
                    className="btn btn-icon btn-danger btn-sm"
                    title="Supprimer"
                    onClick={() => handleSupprimer(ins._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Détail complet */}
                {isOpen && (
                  <div
                    style={{
                      padding: "0 20px 24px 50px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 20,
                    }}
                  >
                    {/* Participant */}
                    <div>
                      <h4
                        style={{
                          fontSize: ".8rem",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          color: "var(--text-muted)",
                          marginBottom: 10,
                        }}
                      >
                        Participant principal
                      </h4>
                      <ul
                        style={{
                          listStyle: "none",
                          fontSize: ".85rem",
                          lineHeight: 1.9,
                        }}
                      >
                        {ins.societe && (
                          <li>
                            <Building2 size={12} style={{ marginRight: 6 }} />
                            {ins.societe}
                          </li>
                        )}
                        <li>
                          <Mail size={12} style={{ marginRight: 6 }} />
                          {ins.email}
                        </li>
                        <li>
                          <Phone size={12} style={{ marginRight: 6 }} />
                          {ins.telephone}
                        </li>
                        <li>
                          <Globe size={12} style={{ marginRight: 6 }} />
                          IP : {ins.ipAddress || "—"}
                        </li>
                        <li>
                          <Calendar size={12} style={{ marginRight: 6 }} />
                          Inscrit le{" "}
                          {format(
                            new Date(ins.createdAt),
                            "d MMM yyyy à HH:mm",
                            { locale: fr }
                          )}
                        </li>
                        <li>
                          {ins.confirme ? (
                            <span style={{ color: "var(--green-600)" }}>
                              ✓ Email de validation envoyé
                              {ins.dateConfirmation
                                ? ` (${format(
                                    new Date(ins.dateConfirmation),
                                    "d MMM HH:mm",
                                    { locale: fr }
                                  )})`
                                : ""}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>
                              Validation pas encore envoyée
                            </span>
                          )}
                        </li>
                      </ul>
                      <div style={{ marginTop: 10 }}>
                        <BlocSatisfaction entree={satisfactionParticipant} />
                      </div>
                    </div>

                    {/* Invités */}
                    <div>
                      <h4
                        style={{
                          fontSize: ".8rem",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          color: "var(--text-muted)",
                          marginBottom: 10,
                        }}
                      >
                        Invités (équipe de 4)
                      </h4>
                      {(ins.invites || []).map((inv, idx) => {
                        const satInv = ins.satisfaction?.find(
                          (s) => s.role === "invite" && s.email === inv.email
                        );
                        return (
                          <div
                            key={idx}
                            style={{
                              marginBottom: 12,
                              paddingBottom: 10,
                              borderBottom:
                                idx < 2 ? "1px dashed var(--border)" : "none",
                            }}
                          >
                            <div
                              style={{ fontWeight: 600, fontSize: ".85rem" }}
                            >
                              {inv.nom}
                            </div>
                            <div
                              style={{
                                fontSize: ".78rem",
                                color: "var(--text-muted)",
                                marginBottom: 4,
                              }}
                            >
                              {inv.email || <em>Pas d'email fourni</em>}
                            </div>
                            {inv.email && <BlocSatisfaction entree={satInv} />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Créneau */}
                    <div>
                      <h4
                        style={{
                          fontSize: ".8rem",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          color: "var(--text-muted)",
                          marginBottom: 10,
                        }}
                      >
                        Créneau
                      </h4>
                      {cr && typeof cr === "object" ? (
                        <ul
                          style={{
                            listStyle: "none",
                            fontSize: ".85rem",
                            lineHeight: 1.9,
                          }}
                        >
                          <li>
                            <Calendar size={12} style={{ marginRight: 6 }} />
                            {format(new Date(ins.date), "EEEE d MMMM yyyy", {
                              locale: fr,
                            })}
                          </li>
                          <li>
                            🕐 {cr.heureDebut} – {cr.heureFin}
                          </li>
                          <li>
                            <MapPin size={12} style={{ marginRight: 6 }} />
                            Type :{" "}
                            {cr.type === "client"
                              ? "Client"
                              : cr.type === "personnel"
                              ? "Personnel"
                              : "Mixte"}
                          </li>
                        </ul>
                      ) : (
                        <p
                          style={{
                            fontSize: ".85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Créneau introuvable
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: "12px 0",
          color: "var(--text-muted)",
          fontSize: ".8rem",
        }}
      >
        {filtered.length} inscription{filtered.length > 1 ? "s" : ""} affichée
        {filtered.length > 1 ? "s" : ""}
        {selectedIds.size > 0 &&
          ` • ${selectedIds.size} sélectionnée${
            selectedIds.size > 1 ? "s" : ""
          }`}
      </div>

      {showExport && (
        <ExportExcelModal
          onClose={() => setShowExport(false)}
          filtre={{
            statut: statutFilter || undefined,
            typeInscrit: typeFilter || undefined,
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Search, Filter, CheckSquare, CheckCircle2, Trash2, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../utils/api";
import { Inscription, Creneau } from "../../types";
import DateSelector from "../../components/forms/DateSelector";
import CreneauSelector from "../../components/forms/CreneauSelector";

type StatutFilter = "" | "en_attente" | "confirme" | "re_reserve" | "annule";
type TypeFilter = "" | "client" | "personnel";

function ReReserverModal({
  inscription,
  onClose,
  onDone,
}: {
  inscription: Inscription;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState("");
  const [creneauId, setCreneauId] = useState("");
  const [loading, setLoading] = useState(false);

  const valider = async () => {
    if (!date || !creneauId) {
      toast.error("Choisissez une date et un créneau");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/inscriptions/${inscription._id}/re-reserver`, { date, creneauId });
      toast.success("Nouveau créneau enregistré, en attente de confirmation");
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la re-réservation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Re-réserver — {inscription.nomComplet}</h3>
        </div>
        <p className="form-hint" style={{ display: "block", margin: "0 0 16px" }}>
          Choisissez un nouveau créneau. Les informations du participant sont conservées, il n'est pas
          nécessaire de les ressaisir.
        </p>
        <div style={{ marginBottom: 14 }}>
          <DateSelector value={date} onChange={(d) => { setDate(d); setCreneauId(""); }} typeInscrit={inscription.typeInscrit} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <CreneauSelector date={date} value={creneauId} onChange={setCreneauId} typeInscrit={inscription.typeInscrit} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={valider} disabled={loading}>
            {loading ? "Enregistrement…" : "Valider le nouveau créneau"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InscriptionsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutFilter>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reReserverCible, setReReserverCible] = useState<Inscription | null>(null);

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

  const handleStatutChange = async (id: string, statut: string) => {
    try {
      const { data } = await api.patch(`/inscriptions/${id}/statut`, {
        statut,
      });
      setInscriptions((prev) =>
        prev.map((i) => (i._id === id ? data.inscription : i))
      );
      toast.success(
        statut === "confirme"
          ? "Inscription validée, email envoyé"
          : statut === "re_reserve"
          ? "Le participant a été notifié qu'il doit choisir un nouveau créneau"
          : "Statut mis à jour"
      );
      if (data.erreursEmail?.length) {
        toast.error(
          `Certains emails n'ont pas pu être envoyés (${data.erreursEmail.length})`
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected =
        filtered.length > 0 && filtered.every((i) => prev.has(i._id));
      if (allVisibleSelected) return new Set();
      return new Set(filtered.map((i) => i._id));
    });
  };

  const handleValiderSelection = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const { data } = await api.patch("/inscriptions/bulk-statut", {
        ids: Array.from(selectedIds),
        statut: "confirme",
      });
      toast.success(data.message);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la validation"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleValiderToutesEnAttente = async () => {
    setBulkLoading(true);
    try {
      const { data } = await api.patch("/inscriptions/bulk-statut", {
        tous: true,
        statut: "confirme",
      });
      toast.success(data.message);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la validation"
      );
    } finally {
      setBulkLoading(false);
    }
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
      toast.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const handleSupprimerSelection = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Supprimer définitivement ${selectedIds.size} inscription(s) ?`)) return;
    setBulkLoading(true);
    try {
      const { data } = await api.delete("/inscriptions/bulk/supprimer", {
        data: { ids: Array.from(selectedIds) },
      });
      toast.success(data.message);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression");
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
      return <span className="badge badge-blue">📅 Re-réservé</span>;
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

  const nbEnAttente = inscriptions.filter(
    (i) => i.statut === "en_attente"
  ).length;
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i._id));

  return (
    <div>
      <h1 className="page-title">Inscriptions</h1>
      <p className="page-subtitle">
        Gestion de toutes les inscriptions aux créneaux
      </p>

      {/* Filters bar */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
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
            <option value="re_reserve">Re-réservées</option>
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
      </div>

      {/* Bulk actions toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          className="btn btn-primary"
          disabled={selectedIds.size === 0 || bulkLoading}
          onClick={handleValiderSelection}
          style={{ fontSize: ".85rem", padding: "8px 16px" }}
        >
          <CheckSquare size={15} style={{ marginRight: 6 }} />
          Valider la sélection ({selectedIds.size})
        </button>

        <button
          className="btn"
          disabled={nbEnAttente === 0 || bulkLoading}
          onClick={handleValiderToutesEnAttente}
          style={{
            fontSize: ".85rem",
            padding: "8px 16px",
            background: "var(--green-700, #2d6a4f)",
            color: "#fff",
          }}
        >
          <CheckCircle2 size={15} style={{ marginRight: 6 }} />
          Valider toutes les inscriptions en attente ({nbEnAttente})
        </button>

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
        <div className="table-wrapper">
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
              <Users size={48} />
              <h3>Aucune inscription</h3>
              <p>
                Modifiez les filtres ou attendez les premières inscriptions.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Coéquipiers</th>
                  <th>Type</th>
                  <th>Créneau</th>
                  <th>Statut</th>
                  <th>Inscrit le</th>
                  <th>Action</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered &&
                  filtered.map((ins) => {
                    const cr = ins.creneau as Creneau;
                    return (
                      <tr key={ins._id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ins._id)}
                            onChange={() => toggleSelect(ins._id)}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {ins.nomComplet}
                          </div>
                          {ins.societe && (
                            <div
                              style={{
                                fontSize: ".75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              🏢 {ins.societe}
                            </div>
                          )}
                          {ins.confirme && (
                            <div
                              style={{
                                fontSize: ".7rem",
                                color: "var(--green-600)",
                              }}
                            >
                              ✓ Email de validation envoyé
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: ".875rem" }}>{ins.email}</div>
                          <div
                            style={{
                              fontSize: ".75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {ins.telephone}
                          </div>
                        </td>
                        <td
                          style={{
                            fontSize: ".78rem",
                            color: "var(--text-secondary)",
                            maxWidth: 220,
                          }}
                        >
                          {(ins.invites || []).map((inv, idx) => (
                            <div key={idx} title={inv.email || ""}>
                              <p style={{ fontWeight: 600 }}>{inv.nom}</p>
                              <p style={{ color: "var(--text-muted)" }}>
                                {inv.email || "—"}
                              </p>
                            </div>
                          ))}
                        </td>
                        <td>
                          {ins.typeInscrit === "client" ? (
                            <span className="badge badge-blue">🧑 Client</span>
                          ) : (
                            <span className="badge badge-green">
                              👷 Personnel
                            </span>
                          )}
                        </td>
                        <td>
                          {cr && typeof cr === "object" ? (
                            <div>
                              <div
                                style={{ fontSize: ".875rem", fontWeight: 500 }}
                              >
                                {format(new Date(ins.date), "d MMM", {
                                  locale: fr,
                                })}{" "}
                                {cr.heureDebut}
                              </div>
                              <div
                                style={{
                                  fontSize: ".75rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                –{cr.heureFin}
                              </div>
                            </div>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td>{statutBadge(ins.statut)}</td>
                        <td
                          style={{
                            fontSize: ".8rem",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {format(new Date(ins.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{
                              fontSize: ".8rem",
                              padding: "5px 8px",
                              width: "auto",
                            }}
                            value={ins.statut}
                            onChange={(e) =>
                              handleStatutChange(ins._id, e.target.value)
                            }
                          >
                            <option value="en_attente" disabled={ins.statut === "confirme"}>
                              En attente
                            </option>
                            <option value="confirme">Confirmée</option>
                            <option value="re_reserve">Re-réservée</option>
                            <option value="annule">Annulée</option>
                          </select>
                          {ins.statut === "re_reserve" && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: 6, width: "100%" }}
                              onClick={() => setReReserverCible(ins)}
                            >
                              <CalendarClock size={13} style={{ marginRight: 4 }} />
                              Re-réserver
                            </button>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-icon btn-danger btn-sm"
                            title="Supprimer"
                            onClick={() => handleSupprimer(ins._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
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

      {reReserverCible && (
        <ReReserverModal
          inscription={reReserverCible}
          onClose={() => setReReserverCible(null)}
          onDone={() => {
            setReReserverCible(null);
            load();
          }}
        />
      )}
    </div>
  );
}

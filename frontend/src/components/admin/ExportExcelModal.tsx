import { useEffect, useState } from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { ChampExport } from '../../types';

interface Props {
  onClose: () => void;
  // Filtres actuellement appliqués sur la page (pour exporter le même périmètre que ce qui est affiché)
  filtre?: { statut?: string; typeInscrit?: string };
}

export default function ExportExcelModal({ onClose, filtre }: Props) {
  const [champs, setChamps] = useState<ChampExport[]>([]);
  const [selectionnes, setSelectionnes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/inscriptions/export/champs')
      .then((r) => {
        setChamps(r.data);
        setSelectionnes(new Set(r.data.map((c: ChampExport) => c.id))); // tout cocher par défaut
      })
      .catch(() => toast.error("Impossible de charger la liste des champs"))
      .finally(() => setLoading(false));
  }, []);

  const groupes: string[] = Array.from(new Set(champs.map((c) => c.groupe)));

  const toggleChamp = (id: string) => {
    setSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroupe = (groupe: string) => {
    const idsGroupe = champs.filter((c) => c.groupe === groupe).map((c) => c.id);
    const tousCoches = idsGroupe.every((id) => selectionnes.has(id));
    setSelectionnes((prev) => {
      const next = new Set(prev);
      idsGroupe.forEach((id) => (tousCoches ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toutCocher = () => setSelectionnes(new Set(champs.map((c) => c.id)));
  const toutDecocher = () => setSelectionnes(new Set());

  const handleDownload = async () => {
    if (selectionnes.size === 0) {
      toast.error('Sélectionnez au moins un champ');
      return;
    }
    setDownloading(true);
    try {
      const response = await api.post(
        '/inscriptions/export',
        { champs: Array.from(selectionnes), ...filtre },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `inscriptions-${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
      onClose();
    } catch (err: any) {
      toast.error('Erreur lors de la génération du fichier');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem' }}>
            <FileSpreadsheet size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Exporter en Excel
          </h2>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '.8rem', padding: '6px 12px' }} onClick={toutCocher}>
                Tout cocher
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '.8rem', padding: '6px 12px' }} onClick={toutDecocher}>
                Tout décocher
              </button>
            </div>

            {groupes.map((groupe) => {
              const champsGroupe = champs.filter((c) => c.groupe === groupe);
              const tousCoches = champsGroupe.every((c) => selectionnes.has(c.id));
              return (
                <div key={groupe} style={{ marginBottom: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '.85rem', marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={tousCoches} onChange={() => toggleGroupe(groupe)} />
                    {groupe}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, paddingLeft: 22 }}>
                    {champsGroupe.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectionnes.has(c.id)} onChange={() => toggleChamp(c.id)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-6" style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button type="button" className="btn btn-primary btn-full" onClick={handleDownload} disabled={downloading}>
                <Download size={16} style={{ marginRight: 6 }} />
                {downloading ? 'Génération…' : `Télécharger (${selectionnes.size} champ${selectionnes.size > 1 ? 's' : ''})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

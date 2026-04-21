import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { admin } from '../../api/admin.api';
import { showToast } from '../../components/ui/Toast';

const NAV = [{ label: 'Support', items: [
  { to: '/admin',         icon: '📊', label: 'Tableau de bord' },
  { to: '/admin/tickets', icon: '🎫', label: 'Tickets support' },
  { to: '/admin/litiges', icon: '⚖️', label: 'Litiges' },
]}];

export default function AdminSupport() {
  const [view, setView] = useState('litiges');
  const [litiges, setLitiges] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState({ gagnant: '', resolution: '' });

  useEffect(() => {
    Promise.all([admin.getLitiges(), admin.getTickets()])
      .then(([l, t]) => { setLitiges(l.data.litiges || []); setTickets(t.data.tickets || []); })
      .finally(() => setLoading(false));
  }, []);

  const handleDecision = async () => {
    if (!decision.gagnant || !decision.resolution.trim()) return;
    try {
      await admin.deciderLitige(selected.id, decision);
      setLitiges((prev) => prev.filter((l) => l.id !== selected.id));
      setSelected(null); setDecision({ gagnant: '', resolution: '' });
      showToast('✅ Décision enregistrée', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const items = view === 'litiges' ? litiges : tickets;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Support Client"/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6">
          <div className="font-syne font-bold">Support Client</div>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {[
              { key: 'litiges', label: `⚖️ Litiges (${litiges.length})` },
              { key: 'tickets', label: `🎫 Tickets (${tickets.length})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setView(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                  view === tab.key ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg-2 border-white/[0.06] text-white/50 hover:border-white/20'
                }`}>{tab.label}</button>
            ))}
          </div>

          {/* Litige decision modal */}
          {selected && view === 'litiges' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg">
                <div className="font-syne font-bold mb-1">Décision — Litige #{selected.id}</div>
                <div className="text-xs text-white/40 mb-4">{selected.sujet}</div>
                <div className="mb-4">
                  <label className="text-xs text-white/40 block mb-1.5">Gagnant *</label>
                  <select value={decision.gagnant} onChange={(e) => setDecision({ ...decision, gagnant: e.target.value })}
                    className="input-dark">
                    <option value="">Sélectionner...</option>
                    <option value="client">Client</option>
                    <option value="vendeur">Vendeur</option>
                    <option value="partage">Partage</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-white/40 block mb-1.5">Résolution *</label>
                  <textarea value={decision.resolution} onChange={(e) => setDecision({ ...decision, resolution: e.target.value })}
                    rows={3} className="input-dark resize-none"/>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleDecision} className="btn-primary flex-1">Enregistrer</button>
                  <button onClick={() => { setSelected(null); setDecision({ gagnant: '', resolution: '' }); }} className="btn-secondary flex-1">Annuler</button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-16 animate-pulse"/>)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <div className="text-4xl mb-2 opacity-20">{view === 'litiges' ? '⚖️' : '🎫'}</div>
              <div>Aucun {view === 'litiges' ? 'litige' : 'ticket'} en cours</div>
            </div>
          ) : (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
              {items.map((item, i) => (
                <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${i < items.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.sujet || item.titre}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {item.client_nom || item.user_nom} · {new Date(item.cree_le).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span className={item.statut === 'ouvert' ? 'badge-red' : item.statut === 'resolu' ? 'badge-green' : 'badge-gold'}>
                    {item.statut}
                  </span>
                  {view === 'litiges' && item.statut === 'ouvert' && (
                    <button onClick={() => setSelected(item)} className="text-xs text-primary hover:underline">Traiter →</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { admin } from '../../api/admin.api';
import { showToast } from '../../components/ui/Toast';

const NAV = [{ label: 'Logistique', items: [
  { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
  { to: '/admin/commandes', icon: '🚚', label: 'Commandes' },
  { to: '/admin/relais',    icon: '📍', label: 'Points relais' },
]}];

const STATUTS = ['en_attente','confirmee','en_preparation','expedie','livre','annulee'];

export default function AdminLogistics() {
  const [view, setView] = useState('commandes');
  const [commandes, setCommandes] = useState([]);
  const [relais, setRelais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRelais, setShowAddRelais] = useState(false);
  const [relaisForm, setRelaisForm] = useState({ nom: '', adresse: '', ville: '', telephone: '' });

  useEffect(() => {
    Promise.all([admin.getCommandes(), admin.getRelais()])
      .then(([c, r]) => { setCommandes(c.data.commandes || []); setRelais(r.data.relais || []); })
      .finally(() => setLoading(false));
  }, []);

  const handleStatut = async (id, statut) => {
    try {
      await admin.updateStatutCommande(id, { statut });
      setCommandes((prev) => prev.map((c) => c.id === id ? { ...c, statut } : c));
      showToast('✅ Statut mis à jour', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const handleAddRelais = async (e) => {
    e.preventDefault();
    try {
      await admin.addRelais(relaisForm);
      admin.getRelais().then((r) => setRelais(r.data.relais || []));
      setShowAddRelais(false);
      setRelaisForm({ nom: '', adresse: '', ville: '', telephone: '' });
      showToast('✅ Point relais ajouté', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const handleToggleRelais = async (id) => {
    try {
      await admin.toggleRelais(id);
      setRelais((prev) => prev.map((r) => r.id === id ? { ...r, est_actif: !r.est_actif } : r));
    } catch { showToast('Erreur.', 'error'); }
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Logistique"/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div className="font-syne font-bold">Logistique</div>
          {view === 'relais' && (
            <button onClick={() => setShowAddRelais(true)} className="btn-primary text-xs px-4 py-2">+ Ajouter relais</button>
          )}
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {[
              { key: 'commandes', label: `🚚 Commandes (${commandes.length})` },
              { key: 'relais',    label: `📍 Points relais (${relais.length})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setView(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                  view === tab.key ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg-2 border-white/[0.06] text-white/50 hover:border-white/20'
                }`}>{tab.label}</button>
            ))}
          </div>

          {showAddRelais && (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 mb-6">
              <div className="font-syne font-bold text-sm mb-4">Nouveau point relais</div>
              <form onSubmit={handleAddRelais} className="grid grid-cols-2 gap-4">
                <input value={relaisForm.nom} onChange={(e) => setRelaisForm({ ...relaisForm, nom: e.target.value })}
                  placeholder="Nom du point relais *" required className="input-dark col-span-2"/>
                <input value={relaisForm.adresse} onChange={(e) => setRelaisForm({ ...relaisForm, adresse: e.target.value })}
                  placeholder="Adresse *" required className="input-dark"/>
                <input value={relaisForm.ville} onChange={(e) => setRelaisForm({ ...relaisForm, ville: e.target.value })}
                  placeholder="Ville *" required className="input-dark"/>
                <input value={relaisForm.telephone} onChange={(e) => setRelaisForm({ ...relaisForm, telephone: e.target.value })}
                  placeholder="Téléphone" className="input-dark col-span-2"/>
                <div className="col-span-2 flex gap-3">
                  <button type="submit" className="btn-primary">Ajouter</button>
                  <button type="button" onClick={() => setShowAddRelais(false)} className="btn-secondary">Annuler</button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-16 animate-pulse"/>)}</div>
          ) : view === 'commandes' ? (
            commandes.length === 0 ? (
              <div className="text-center py-20 text-white/30"><div className="text-4xl mb-2 opacity-20">🚚</div><div>Aucune commande</div></div>
            ) : (
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Référence','Client','Total','Statut','Action'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.map((c) => (
                      <tr key={c.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]">
                        <td className="px-4 py-3 font-mono text-primary text-xs font-bold">{c.reference}</td>
                        <td className="px-4 py-3 text-sm">{c.client_nom}</td>
                        <td className="px-4 py-3 text-sm font-bold">{Number(c.total).toLocaleString()} F</td>
                        <td className="px-4 py-3">
                          <span className="badge-gold text-[10px]">{c.statut}</span>
                        </td>
                        <td className="px-4 py-3">
                          <select value={c.statut}
                            onChange={(e) => handleStatut(c.id, e.target.value)}
                            className="text-xs bg-bg-3 border border-white/[0.06] rounded-lg px-2 py-1 text-white/70">
                            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            relais.length === 0 ? (
              <div className="text-center py-20 text-white/30"><div className="text-4xl mb-2 opacity-20">📍</div><div>Aucun point relais</div></div>
            ) : (
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
                {relais.map((r, i) => (
                  <div key={r.id} className={`flex items-center gap-4 px-5 py-4 ${i < relais.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                    <div className="text-2xl">📍</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{r.nom}</div>
                      <div className="text-xs text-white/40">{r.adresse}, {r.ville}</div>
                    </div>
                    <span className={r.est_actif ? 'badge-green' : 'badge-red'}>{r.est_actif ? '● Actif' : '● Inactif'}</span>
                    <button onClick={() => handleToggleRelais(r.id)} className="text-xs text-white/40 hover:text-primary transition-colors">
                      {r.est_actif ? '🔒' : '🔓'}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

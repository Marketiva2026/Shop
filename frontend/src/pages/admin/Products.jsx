import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { admin } from '../../api/admin.api';
import { showToast } from '../../components/ui/Toast';

const NAV = [{ label: 'Contenu', items: [
  { to: '/admin',          icon: '📊', label: 'Tableau de bord' },
  { to: '/admin/produits', icon: '📦', label: 'Produits' },
]}];

export default function AdminProducts() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('en_attente');
  const [rejectId, setRejectId] = useState(null);
  const [rejectMotif, setRejectMotif] = useState('');

  const load = (f) => {
    setLoading(true);
    admin.getProduits({ statut: f }).then((r) => setProduits(r.data.produits || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleValider = async (id) => {
    try {
      await admin.validerProduit(id);
      setProduits((prev) => prev.filter((p) => p.id !== id));
      showToast('✅ Produit validé', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const handleRejeter = async () => {
    if (!rejectMotif.trim()) return;
    try {
      await admin.rejeterProduit(rejectId, { motif: rejectMotif });
      setProduits((prev) => prev.filter((p) => p.id !== rejectId));
      setRejectId(null); setRejectMotif('');
      showToast('Produit rejeté.', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Contenu & Produits"/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6">
          <div className="font-syne font-bold">Modération Produits</div>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {['en_attente','publie','rejete'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                  filter === s ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg-2 border-white/[0.06] text-white/50 hover:border-white/20'
                }`}>{s.replace('_', ' ')}</button>
            ))}
          </div>

          {rejectId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 w-full max-w-md">
                <div className="font-syne font-bold mb-4">Motif de rejet</div>
                <textarea value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)}
                  placeholder="Expliquer pourquoi ce produit est rejeté..." rows={4}
                  className="input-dark resize-none mb-4"/>
                <div className="flex gap-3">
                  <button onClick={handleRejeter} className="btn-danger flex-1">Rejeter</button>
                  <button onClick={() => { setRejectId(null); setRejectMotif(''); }} className="btn-secondary flex-1">Annuler</button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-20 animate-pulse"/>)}</div>
          ) : produits.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <div className="text-4xl mb-2 opacity-20">📦</div>
              <div>Aucun produit {filter.replace('_', ' ')}</div>
            </div>
          ) : (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
              {produits.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i < produits.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-bg-3 overflow-hidden flex-shrink-0">
                    {p.image_principale
                      ? <img src={p.image_principale} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-xl opacity-20">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.nom}</div>
                    <div className="text-xs text-white/40">{p.boutique_nom} · {Number(p.prix).toLocaleString()} FCFA</div>
                  </div>
                  <div className="text-xs text-white/30">{new Date(p.cree_le).toLocaleDateString('fr-FR')}</div>
                  {filter === 'en_attente' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleValider(p.id)} className="text-xs text-success hover:underline">✅ Valider</button>
                      <button onClick={() => setRejectId(p.id)} className="text-xs text-red-400 hover:underline">❌ Rejeter</button>
                    </div>
                  )}
                  {filter !== 'en_attente' && (
                    <span className={p.statut === 'publie' ? 'badge-green' : 'badge-red'}>{p.statut}</span>
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

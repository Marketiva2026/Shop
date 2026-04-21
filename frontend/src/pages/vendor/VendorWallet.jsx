import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import api from '../../api/axios.config';
import { showToast } from '../../components/ui/Toast';

const NAV = [{ label: 'Vendeur', items: [
  { to: '/vendeur',           icon: '📊', label: 'Tableau de bord' },
  { to: '/vendeur/produits',  icon: '📦', label: 'Mes produits' },
  { to: '/vendeur/commandes', icon: '🛒', label: 'Commandes' },
  { to: '/vendeur/wallet',    icon: '💰', label: 'Wallet' },
  { to: '/vendeur/boutique',  icon: '🏪', label: 'Ma boutique' },
]}];

export default function VendorWallet() {
  const [data, setData] = useState({ solde: 0, retraits: [] });
  const [form, setForm] = useState({ montant: '', methode: 'mtn_momo', numero: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/vendeur/wallet').then((r) => setData(r.data)); }, []);

  const handleRetrait = async (e) => {
    e.preventDefault();
    if (Number(form.montant) < 1000) { showToast('Montant minimum : 1 000 FCFA', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/vendeur/retraits', form);
      showToast('✅ Demande de retrait envoyée', 'success');
      setForm({ montant: '', methode: 'mtn_momo', numero: '' });
      api.get('/vendeur/wallet').then((r) => setData(r.data));
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Espace Vendeur"/>
      <div className="ml-[250px] flex-1 p-6">
        <div className="font-syne text-xl font-bold mb-6">Wallet Vendeur</div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-success/10 to-bg-2 border border-success/20 rounded-2xl p-6 text-center">
            <div className="text-white/50 text-sm mb-1">Solde disponible</div>
            <div className="font-syne text-4xl font-extrabold text-success">{Number(data.solde).toLocaleString()} FCFA</div>
          </div>

          <form onSubmit={handleRetrait} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="font-syne font-bold text-sm">Demander un retrait</div>
            <input value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })}
              type="number" placeholder="Montant (FCFA)" required className="input-dark"/>
            <select value={form.methode} onChange={(e) => setForm({ ...form, methode: e.target.value })} className="input-dark">
              <option value="mtn_momo">MTN MoMo</option>
              <option value="orange_money">Orange Money</option>
              <option value="moov_money">Moov Money</option>
              <option value="wave">Wave</option>
            </select>
            <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })}
              placeholder="Numéro de compte" required className="input-dark"/>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? '...' : 'Demander le retrait'}
            </button>
          </form>
        </div>

        <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] font-syne font-bold text-sm">Historique retraits</div>
          {!data.retraits?.length ? (
            <div className="text-center py-10 text-white/30 text-sm">Aucun retrait</div>
          ) : data.retraits.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] last:border-0">
              <div>
                <div className="text-sm font-medium">{Number(r.montant).toLocaleString()} FCFA</div>
                <div className="text-xs text-white/30">{r.methode} · {new Date(r.cree_le).toLocaleDateString('fr-FR')}</div>
              </div>
              <span className={r.statut === 'valide' ? 'badge-green' : r.statut === 'refuse' ? 'badge-red' : 'badge-gold'}>
                {r.statut}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

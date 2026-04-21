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

export default function VendorOrders() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vendeur/commandes').then((r) => setCommandes(r.data.commandes || [])).finally(() => setLoading(false));
  }, []);

  const handleStatut = async (itemId, statut) => {
    try {
      await api.patch(`/vendeur/commandes/${itemId}/statut`, { statut });
      setCommandes((prev) => prev.map((c) => c.item_id === itemId ? { ...c, statut_vendeur: statut } : c));
      showToast('✅ Statut mis à jour', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Espace Vendeur"/>
      <div className="ml-[250px] flex-1 p-6">
        <div className="font-syne text-xl font-bold mb-6">Commandes reçues</div>
        {loading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-16 animate-pulse"/>)}</div>
        ) : commandes.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-sm">Aucune commande</div>
        ) : (
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Référence','Produit','Qté','Sous-total','Statut commande','Statut vendeur','Action'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commandes.map((c, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]">
                    <td className="px-4 py-3 text-primary font-bold text-xs font-mono">{c.reference}</td>
                    <td className="px-4 py-3 text-sm max-w-[140px] truncate">{c.nom_produit}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{c.quantite}</td>
                    <td className="px-4 py-3 text-sm font-bold">{Number(c.sous_total).toLocaleString()} F</td>
                    <td className="px-4 py-3"><span className="badge-blue text-[10px]">{c.statut}</span></td>
                    <td className="px-4 py-3"><span className="badge-gold text-[10px]">{c.statut_vendeur}</span></td>
                    <td className="px-4 py-3">
                      {c.statut_vendeur === 'en_attente' && (
                        <button onClick={() => handleStatut(c.item_id, 'prepare')} className="text-xs text-success hover:underline">✅ Prêt</button>
                      )}
                      {c.statut_vendeur === 'prepare' && (
                        <button onClick={() => handleStatut(c.item_id, 'expedie')} className="text-xs text-blue-400 hover:underline">📦 Expédié</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

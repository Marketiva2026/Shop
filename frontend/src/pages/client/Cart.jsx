import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';
import { creerCommande } from '../../api/order.api';
import { showToast } from '../../components/ui/Toast';

export default function Cart() {
  const { items, removeItem, updateQuantite, clear, total } = useCartStore();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCommander = async () => {
    if (!token) { navigate('/connexion'); return; }
    setLoading(true);
    try {
      const res = await creerCommande({
        items: items.map((i) => ({ produit_id: i.produit_id, quantite: i.quantite })),
        mode_livraison: 'point_relais',
      });
      clear();
      showToast('✅ Commande créée !', 'success');
      navigate(`/commandes/${res.data.commande_id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la commande.', 'error');
    } finally { setLoading(false); }
  };

  if (!items.length) return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white/30">
        <div className="text-7xl mb-4 opacity-20">🛒</div>
        <div className="font-syne text-xl font-bold mb-2">Votre panier est vide</div>
        <Link to="/explorer" className="btn-primary mt-4">Explorer les produits</Link>
      </div>
    </div>
  );

  const frais = 1500;
  const sousTotal = total();
  const montantTotal = sousTotal + frais;

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-syne text-2xl font-bold mb-6">Mon panier ({items.length} article{items.length > 1 ? 's' : ''})</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.produit_id} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-4 flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-bg-3 overflow-hidden flex-shrink-0">
                  {item.image
                    ? <img src={item.image} alt={item.nom} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">📦</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-tight mb-1 truncate">{item.nom}</div>
                  <div className="text-primary font-bold text-sm">{item.prix.toLocaleString()} FCFA</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => removeItem(item.produit_id)} className="text-white/20 hover:text-red-400 transition-colors text-xs">✕</button>
                  <div className="flex items-center gap-2 bg-bg-3 rounded-lg px-2 py-1">
                    <button onClick={() => updateQuantite(item.produit_id, item.quantite - 1)} className="text-white/40 hover:text-white text-sm w-4 text-center">−</button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantite}</span>
                    <button onClick={() => updateQuantite(item.produit_id, item.quantite + 1)} className="text-white/40 hover:text-white text-sm w-4 text-center">+</button>
                  </div>
                  <div className="text-xs text-white/40">{(item.prix * item.quantite).toLocaleString()} FCFA</div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5 h-fit sticky top-20">
            <div className="font-syne font-bold mb-4">Récapitulatif</div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-white/60">
                <span>Sous-total</span>
                <span>{sousTotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Livraison</span>
                <span>{frais.toLocaleString()} FCFA</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{montantTotal.toLocaleString()} FCFA</span>
              </div>
            </div>
            <button onClick={handleCommander} disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? '...' : token ? '💳 Commander' : '🔐 Se connecter pour commander'}
            </button>
            <button onClick={clear} className="w-full text-xs text-white/30 hover:text-red-400 mt-3 transition-colors">
              Vider le panier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

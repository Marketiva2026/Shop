import { Link } from 'react-router-dom';
import useCartStore from '../../store/cart.store';
import { showToast } from './Toast';

export default function ProductCard({ produit }) {
  const addItem = useCartStore((s) => s.addItem);
  const hasPromo = produit.prix_promo && produit.prix_promo < produit.prix;

  const handleAdd = (e) => {
    e.preventDefault();
    addItem(produit);
    showToast('✅ Ajouté au panier', 'success');
  };

  return (
    <Link to={`/produit/${produit.slug}`} className="group block">
      <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all duration-200 hover:-translate-y-0.5">
        <div className="aspect-square bg-bg-3 overflow-hidden relative">
          {produit.image_principale ? (
            <img src={produit.image_principale} alt={produit.nom}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">📦</div>
          )}
          {hasPromo && (
            <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              PROMO
            </div>
          )}
          {produit.est_certifiee && (
            <div className="absolute top-2 right-2 text-xs">✅</div>
          )}
        </div>
        <div className="p-3">
          <div className="text-xs text-white/40 mb-1 truncate">{produit.boutique_nom}</div>
          <div className="font-medium text-sm leading-tight mb-2 line-clamp-2">{produit.nom}</div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-primary text-sm">
                {(hasPromo ? produit.prix_promo : produit.prix).toLocaleString()} FCFA
              </div>
              {hasPromo && (
                <div className="text-[10px] text-white/30 line-through">
                  {produit.prix.toLocaleString()} FCFA
                </div>
              )}
            </div>
            <button onClick={handleAdd}
              className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-lg
                         hover:bg-primary hover:text-white transition-all">
              +
            </button>
          </div>
          {produit.note_moyenne > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-gold text-xs">★</span>
              <span className="text-xs text-white/50">{produit.note_moyenne.toFixed(1)}</span>
              <span className="text-xs text-white/30">({produit.total_avis})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

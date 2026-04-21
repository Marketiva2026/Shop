import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import { getProduit } from '../../api/product.api';
import useCartStore from '../../store/cart.store';
import { showToast } from '../../components/ui/Toast';

export default function ProductDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    getProduit(slug)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  );

  if (!data?.produit) return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="flex flex-col items-center justify-center h-64 text-white/30">
        <div className="text-5xl mb-3">🔍</div>
        <div className="font-syne font-bold">Produit introuvable</div>
        <Link to="/explorer" className="mt-4 text-primary hover:underline text-sm">← Explorer</Link>
      </div>
    </div>
  );

  const { produit, images, avis } = data;
  const imgs = images?.length ? images : [{ url: null }];
  const prix = produit.prix_promo || produit.prix;
  const hasPromo = produit.prix_promo && produit.prix_promo < produit.prix;

  const handleAdd = () => {
    addItem({ ...produit, image_principale: imgs[0]?.url }, qty);
    showToast(`✅ ${qty}x ajouté au panier`, 'success');
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-white/30 mb-6">
          <Link to="/" className="hover:text-white">Accueil</Link>
          <span>/</span>
          <Link to="/explorer" className="hover:text-white">Explorer</Link>
          <span>/</span>
          <span className="text-white/60 truncate">{produit.nom}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="bg-bg-2 rounded-2xl overflow-hidden aspect-square mb-3 border border-white/[0.06]">
              {imgs[imgIdx]?.url ? (
                <img src={imgs[imgIdx].url} alt={produit.nom} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl opacity-10">📦</div>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {imgs.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all
                      ${i === imgIdx ? 'border-primary' : 'border-white/10'}`}>
                    {img.url
                      ? <img src={img.url} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-bg-3"/>
                    }
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link to={`/boutique/${produit.boutique_slug}`}
                className="text-xs text-primary font-semibold hover:underline">
                🏪 {produit.boutique_nom}
              </Link>
              {produit.est_certifiee && <span className="badge-green">✓ Certifié</span>}
            </div>

            <h1 className="font-syne text-2xl font-bold mb-4 leading-tight">{produit.nom}</h1>

            <div className="flex items-end gap-3 mb-6">
              <div className="font-syne text-3xl font-extrabold text-primary">
                {prix.toLocaleString()} FCFA
              </div>
              {hasPromo && (
                <div className="text-white/30 line-through text-lg mb-0.5">
                  {produit.prix.toLocaleString()} FCFA
                </div>
              )}
            </div>

            {/* Qty + Add */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-3 bg-bg-3 border border-white/10 rounded-xl px-3 py-2">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-white/50 hover:text-white w-6 text-center">−</button>
                <span className="font-bold w-6 text-center">{qty}</span>
                <button onClick={() => setQty(Math.min(produit.stock, qty + 1))} className="text-white/50 hover:text-white w-6 text-center">+</button>
              </div>
              <button onClick={handleAdd} disabled={produit.stock === 0}
                className="btn-primary flex-1 justify-center py-3 disabled:opacity-40">
                {produit.stock === 0 ? 'Rupture de stock' : '🛒 Ajouter au panier'}
              </button>
            </div>

            <div className="text-xs text-white/40 mb-6">
              Stock : <span className={produit.stock > 5 ? 'text-success' : 'text-gold'}>{produit.stock} disponible{produit.stock > 1 ? 's' : ''}</span>
            </div>

            {/* Description */}
            {produit.description && (
              <div className="bg-bg-2 border border-white/[0.06] rounded-xl p-4 mb-6">
                <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Description</div>
                <div className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{produit.description}</div>
              </div>
            )}

            {/* Note */}
            {produit.note_moyenne > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gold text-lg">★</span>
                <span className="font-bold">{produit.note_moyenne.toFixed(1)}</span>
                <span className="text-white/40">({produit.total_avis} avis)</span>
              </div>
            )}
          </div>
        </div>

        {/* Avis */}
        {avis?.length > 0 && (
          <div className="mt-10">
            <h2 className="font-syne text-lg font-bold mb-4">Avis clients</h2>
            <div className="space-y-3">
              {avis.map((a, i) => (
                <div key={i} className="bg-bg-2 border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-bg-3 flex items-center justify-center text-sm font-bold">
                      {a.nom_complet[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.nom_complet}</div>
                      <div className="flex text-gold text-xs">{'★'.repeat(a.note)}<span className="text-white/20">{'★'.repeat(5 - a.note)}</span></div>
                    </div>
                  </div>
                  <p className="text-sm text-white/60">{a.commentaire}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

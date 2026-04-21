import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import ProductCard from '../../components/ui/ProductCard';
import api from '../../api/axios.config';

export default function VendorShopPage() {
  const { id } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/boutiques/${id}`),
      api.get(`/boutiques/${id}/produits`),
    ]).then(([b, p]) => {
      setBoutique(b.data.boutique);
      setProduits(p.data.produits || []);
    }).catch(() => setBoutique(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <PublicNav/>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-bg-2 rounded-2xl h-40 animate-pulse mb-6"/>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-64 animate-pulse"/>)}
          </div>
        </div>
      </div>
    );
  }

  if (!boutique) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-20">🏪</div>
          <div className="font-syne font-bold text-xl">Boutique introuvable</div>
          <Link to="/" className="text-primary text-sm mt-4 block hover:underline">← Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>

      {/* Shop header */}
      <div className="bg-gradient-to-r from-bg-2 to-bg-base border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-bg-3 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {boutique.logo ? <img src={boutique.logo} alt="" className="w-full h-full object-cover rounded-2xl"/> : '🏪'}
            </div>
            <div>
              <h1 className="font-syne text-2xl font-bold">{boutique.nom}</h1>
              {boutique.description && <p className="text-sm text-white/50 mt-1 max-w-xl">{boutique.description}</p>}
              <div className="flex items-center gap-3 mt-2">
                {boutique.ville && <span className="text-xs text-white/30">📍 {boutique.ville}</span>}
                <span className="badge-green">● Boutique active</span>
                <span className="text-xs text-white/30">{produits.length} produit(s)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {produits.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-3 opacity-20">📦</div>
            <div className="font-syne font-bold">Aucun produit disponible</div>
          </div>
        ) : (
          <>
            <div className="font-syne font-bold mb-5">Tous les produits ({produits.length})</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {produits.map((p) => <ProductCard key={p.id} product={p}/>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

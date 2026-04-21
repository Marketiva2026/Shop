import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import ProductCard from '../../components/ui/ProductCard';
import { getProduits, getCategories, rechercher } from '../../api/product.api';

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const q = searchParams.get('q') || '';
  const categorie = searchParams.get('categorie') || '';

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetch = q
      ? rechercher(q, { page })
      : getProduits({ page, limit: 20, categorie: categorie || undefined });

    fetch.then((r) => {
      setProduits(r.data.produits || []);
      setTotal(r.data.total || 0);
    }).finally(() => setLoading(false));
  }, [q, categorie, page]);

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <button onClick={() => setSearchParams({})}
            className={`flex-shrink-0 text-xs px-4 py-2 rounded-full font-medium transition-all
              ${!categorie ? 'bg-primary text-white' : 'bg-bg-2 border border-white/[0.08] text-white/60 hover:border-white/20'}`}>
            Tout
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSearchParams({ categorie: cat.slug })}
              className={`flex-shrink-0 text-xs px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap
                ${categorie === cat.slug ? 'bg-primary text-white' : 'bg-bg-2 border border-white/[0.08] text-white/60 hover:border-white/20'}`}>
              {cat.icone} {cat.nom}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <div className="font-syne text-base font-bold">
            {q ? `Résultats pour "${q}"` : categorie ? categories.find((c) => c.slug === categorie)?.nom || 'Produits' : 'Tous les produits'}
            <span className="text-white/30 font-normal text-sm ml-2">({total} produits)</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl aspect-square animate-pulse"/>)}
          </div>
        ) : produits.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produits.map((p) => <ProductCard key={p.id} produit={p}/>)}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-3 opacity-20">🔍</div>
            <div className="font-syne font-bold">Aucun résultat</div>
            <div className="text-sm mt-1">Essayez avec d'autres termes</div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import ProductCard from '../../components/ui/ProductCard';
import { getProduits, getCategories } from '../../api/product.api';

export default function Home() {
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getProduits({ limit: 12 }), getCategories()])
      .then(([p, c]) => {
        setProduits(p.data.produits || []);
        setCategories(c.data.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explorer?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden py-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(232,72,34,0.12),transparent_60%)]"/>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            🌍 La marketplace de Côte d'Ivoire
          </div>
          <h1 className="font-syne text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Achetez et vendez <br/>
            <span className="text-primary">partout en CI</span>
          </h1>
          <p className="text-white/50 text-lg mb-10 max-w-2xl mx-auto">
            Des milliers de produits, des vendeurs vérifiés, paiement Mobile Money sécurisé.
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit, une boutique..."
              className="flex-1 bg-bg-3 border border-white/[0.08] rounded-xl px-5 py-3.5 text-sm text-white
                         placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button type="submit" className="btn-primary px-6 py-3.5 text-sm">
              Rechercher
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-6 max-w-7xl mx-auto">
        <h2 className="font-syne text-lg font-bold mb-4">Catégories</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/explorer?categorie=${cat.slug}`}
              className="flex-shrink-0 flex items-center gap-2 bg-bg-2 border border-white/[0.06] rounded-xl px-4 py-2.5
                         hover:border-primary/30 hover:bg-primary/5 transition-all text-sm font-medium whitespace-nowrap">
              <span>{cat.icone}</span>
              <span className="text-white/70">{cat.nom}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-syne text-lg font-bold">Produits populaires</h2>
          <Link to="/explorer" className="text-sm text-primary hover:underline">Voir tout →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-bg-2 border border-white/[0.06] rounded-2xl aspect-square animate-pulse"/>
            ))}
          </div>
        ) : produits.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produits.map((p) => <ProductCard key={p.id} produit={p}/>)}
          </div>
        ) : (
          <div className="text-center py-16 text-white/30">
            <div className="text-5xl mb-3 opacity-20">📦</div>
            <div className="font-syne font-bold mb-1">Aucun produit disponible</div>
            <div className="text-sm">La plateforme est en cours de démarrage.</div>
          </div>
        )}
      </section>

      {/* CTA Vendeur */}
      <section className="px-4 py-12 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-primary/10 to-bg-2 border border-primary/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-syne text-xl font-bold mb-2">Devenez vendeur sur MARKETIVA</h3>
            <p className="text-white/50 text-sm">Créez votre boutique gratuitement et commencez à vendre dès aujourd'hui.</p>
          </div>
          <Link to="/inscription" className="btn-primary flex-shrink-0 px-8 py-3">
            🏪 Ouvrir ma boutique
          </Link>
        </div>
      </section>
    </div>
  );
}

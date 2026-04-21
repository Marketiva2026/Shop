import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import api from '../../api/axios.config';

const NAV = [
  { label: 'Vendeur', items: [
    { to: '/vendeur',           icon: '📊', label: 'Tableau de bord' },
    { to: '/vendeur/produits',  icon: '📦', label: 'Mes produits' },
    { to: '/vendeur/commandes', icon: '🛒', label: 'Commandes' },
    { to: '/vendeur/wallet',    icon: '💰', label: 'Wallet' },
    { to: '/vendeur/boutique',  icon: '🏪', label: 'Ma boutique' },
  ]},
];

export default function VendorDashboard() {
  const [stats, setStats] = useState(null);
  const [boutique, setBoutique] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vendeur/dashboard').then((r) => {
      setStats(r.data.stats);
      setBoutique(r.data.boutique);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Espace Vendeur"/>
      <div className="ml-[250px] flex-1 p-6">
        <div className="mb-6">
          <div className="font-syne text-xl font-bold">Tableau de bord vendeur</div>
          {boutique && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-white/40">{boutique.nom}</span>
              <span className={`badge-${boutique.statut === 'active' ? 'green' : 'orange'}`}>
                {boutique.statut === 'active' ? '● Actif' : '⏳ ' + boutique.statut}
              </span>
            </div>
          )}
        </div>

        {boutique?.statut === 'en_attente' && (
          <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-3 text-gold text-sm mb-6 flex gap-2">
            <span>⏳</span>
            <span>Votre boutique est en attente de validation par l'équipe MARKETIVA. Vous pourrez ajouter des produits une fois validée.</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-28 animate-pulse"/>)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Produits', val: stats.total_produits, icon: '📦', color: 'text-blue-400' },
              { label: 'Commandes', val: stats.total_commandes, icon: '🛒', color: 'text-success' },
              { label: 'En cours', val: stats.commandes_en_cours, icon: '⏳', color: 'text-gold' },
              { label: 'Wallet', val: Number(stats.wallet_solde).toLocaleString() + ' F', icon: '💰', color: 'text-primary' },
            ].map((kpi, i) => (
              <div key={i} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
                <div className="text-2xl mb-2">{kpi.icon}</div>
                <div className={`font-syne text-2xl font-bold ${kpi.color}`}>{kpi.val}</div>
                <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/vendeur/produits" className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 hover:border-primary/30 transition-all group">
            <div className="text-3xl mb-3">📦</div>
            <div className="font-syne font-bold mb-1 group-hover:text-primary transition-colors">Gérer mes produits</div>
            <div className="text-sm text-white/40">Ajouter, modifier, supprimer vos produits</div>
          </Link>
          <Link to="/vendeur/commandes" className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 hover:border-success/30 transition-all group">
            <div className="text-3xl mb-3">🛒</div>
            <div className="font-syne font-bold mb-1 group-hover:text-success transition-colors">Voir les commandes</div>
            <div className="text-sm text-white/40">Préparer et expédier les commandes</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

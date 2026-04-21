import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { admin } from '../../api/admin.api';

const NAV = [{ label: 'Marketing', items: [
  { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
  { to: '/admin/analytics', icon: '📣', label: 'Analytiques' },
]}];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin.getAnalytics().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Marketing"/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6">
          <div className="font-syne font-bold">Analytiques & Marketing</div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-28 animate-pulse"/>)}</div>
          ) : data ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Visiteurs (30j)', val: data.visiteurs || '—', icon: '👁️', color: 'text-blue-400' },
                  { label: 'Nouveaux clients', val: data.nouveaux_clients || '—', icon: '👤', color: 'text-success' },
                  { label: 'Taux conversion', val: data.taux_conversion ? data.taux_conversion + '%' : '—', icon: '📈', color: 'text-primary' },
                  { label: 'Panier moyen', val: data.panier_moyen ? Number(data.panier_moyen).toLocaleString() + ' F' : '—', icon: '🛒', color: 'text-gold' },
                  { label: 'Produits vus', val: data.produits_vus || '—', icon: '📦', color: 'text-blue-400' },
                  { label: 'Taux retour', val: data.taux_retour ? data.taux_retour + '%' : '—', icon: '🔄', color: 'text-red-400' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
                    <div className="text-2xl mb-2">{kpi.icon}</div>
                    <div className={`font-syne text-2xl font-bold ${kpi.color}`}>{kpi.val}</div>
                    <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {data.top_produits?.length > 0 && (
                <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
                  <div className="px-5 py-4 border-b border-white/[0.06] font-syne font-bold text-sm">🏆 Top Produits</div>
                  {data.top_produits.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                      <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.nom}</div>
                        <div className="text-xs text-white/30">{p.boutique_nom}</div>
                      </div>
                      <div className="text-xs text-white/60">{p.nb_ventes} ventes</div>
                      <div className="text-sm font-bold text-success">{Number(p.chiffre_affaires).toLocaleString()} F</div>
                    </div>
                  ))}
                </div>
              )}

              {data.top_vendeurs?.length > 0 && (
                <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] font-syne font-bold text-sm">🏪 Top Vendeurs</div>
                  {data.top_vendeurs.map((v, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                      <div className="w-6 h-6 bg-gold/20 rounded-lg flex items-center justify-center text-xs font-bold text-gold">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{v.boutique_nom}</div>
                      </div>
                      <div className="text-xs text-white/60">{v.nb_commandes} commandes</div>
                      <div className="text-sm font-bold text-gold">{Number(v.chiffre_affaires).toLocaleString()} F</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-white/30">
              <div className="text-4xl mb-2 opacity-20">📊</div>
              <div>Aucune donnée disponible</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

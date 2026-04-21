import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { admin } from '../../api/admin.api';
import api from '../../api/axios.config';
import useAuthStore from '../../store/auth.store';

const ROLE_NAV = {
  admin_support: [
    { label: 'Support', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/tickets',   icon: '🎫', label: 'Tickets support' },
      { to: '/admin/litiges',   icon: '⚖️', label: 'Litiges' },
    ]},
  ],
  admin_finances: [
    { label: 'Finances', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/retraits',  icon: '💸', label: 'Retraits' },
      { to: '/admin/finances',  icon: '📈', label: 'Analytiques' },
    ]},
  ],
  admin_vendeurs: [
    { label: 'Vendeurs', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/vendeurs',  icon: '🏪', label: 'Boutiques' },
    ]},
  ],
  admin_contenu: [
    { label: 'Contenu', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/produits',  icon: '📦', label: 'Produits' },
    ]},
  ],
  admin_logistique: [
    { label: 'Logistique', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/commandes', icon: '🚚', label: 'Commandes' },
      { to: '/admin/relais',    icon: '📍', label: 'Points relais' },
    ]},
  ],
  admin_marketing: [
    { label: 'Marketing', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/analytics', icon: '📣', label: 'Analytiques' },
    ]},
  ],
  agent_relais: [
    { label: 'Relais', items: [
      { to: '/admin',           icon: '📊', label: 'Tableau de bord' },
      { to: '/admin/commandes', icon: '📦', label: 'Commandes relais' },
    ]},
  ],
};

const ROLE_LABELS = {
  admin_support: 'Support Client', admin_finances: 'Finances',
  admin_vendeurs: 'Gestion Vendeurs', admin_contenu: 'Contenu & Produits',
  admin_logistique: 'Logistique', admin_marketing: 'Marketing', agent_relais: 'Agent Relais',
};

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard/moi').then((r) => setKpis(r.data.kpis)).catch(() => {});
  }, []);

  const nav = ROLE_NAV[user?.role] || [];

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={nav} title={ROLE_LABELS[user?.role] || 'Administration'}/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6">
          <div>
            <div className="font-syne font-bold">Tableau de bord</div>
            <div className="text-[10px] text-white/30">{ROLE_LABELS[user?.role]} · {user?.nom_complet}</div>
          </div>
        </div>

        <div className="p-6">
          {kpis && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {kpis.map((kpi, i) => (
                <div key={i} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
                  <div className="text-2xl mb-2">{kpi.icon}</div>
                  <div className={`font-syne text-2xl font-bold ${kpi.color || 'text-white'}`}>{kpi.val}</div>
                  <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Quick links based on role */}
          <div className="grid md:grid-cols-2 gap-4">
            {(nav[0]?.items || []).slice(1).map((item) => (
              <Link key={item.to} to={item.to}
                className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 hover:border-primary/30 transition-all group">
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-syne font-bold mb-1 group-hover:text-primary transition-colors">{item.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

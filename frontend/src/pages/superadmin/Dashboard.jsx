import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { sa } from '../../api/admin.api';
import useAuthStore from '../../store/auth.store';

const NAV = [
  { label: 'Vue Globale', items: [
    { to: '/superadmin',         icon: '📊', label: 'Tableau de bord' },
    { to: '/superadmin/logs',    icon: '🔍', label: "Logs d'activité" },
  ]},
  { label: 'Équipe Admin', items: [
    { to: '/superadmin/admins',  icon: '🛡️', label: 'Administrateurs' },
  ]},
  { label: 'Utilisateurs', items: [
    { to: '/superadmin/clients', icon: '👥', label: 'Clients & Vendeurs' },
  ]},
  { label: 'Plateforme', items: [
    { to: '/superadmin/config',  icon: '⚙️', label: 'Configuration' },
  ]},
];

const KPI = ({ icon, val, label, sub, color = 'text-white' }) => (
  <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3`} style={{ background: 'rgba(255,255,255,0.05)' }}>
      {icon}
    </div>
    <div className={`font-syne text-2xl font-extrabold ${color}`}>{val}</div>
    <div className="text-xs text-white/40 mt-1">{label}</div>
    {sub && <div className="text-[10px] text-white/25 mt-1.5 pt-1.5 border-t border-white/[0.06]">{sub}</div>}
  </div>
);

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    Promise.all([sa.getStats(), sa.getAdmins()]).then(([s, a]) => {
      setStats(s.data.stats);
      setAdmins(a.data.admins || []);
    });
  }, []);

  const ROLE_ICONS = {
    admin_support: '🎧', admin_finances: '💰', admin_vendeurs: '🏪',
    admin_contenu: '📦', admin_logistique: '🚚', admin_marketing: '📣', agent_relais: '📍',
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Super Administration" crown={true}/>
      <div className="ml-[250px] flex-1">
        {/* Topbar */}
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div>
            <div className="font-syne font-bold">Tableau de bord</div>
            <div className="text-[10px] text-white/30">Super Admin · {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/superadmin/admins" className="btn-primary text-xs px-4 py-2">+ Créer un admin</Link>
          </div>
        </div>

        <div className="p-6">
          {/* Alerte système */}
          <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-success text-sm flex gap-2 mb-6">
            <span>🟢</span>
            <span>Plateforme opérationnelle. {stats?.sessions_actives || 0} session(s) active(s).</span>
          </div>

          {/* KPIs */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPI icon="👥" val={stats.clients}          label="Clients inscrits"   color="text-primary"/>
              <KPI icon="🏪" val={stats.vendeurs_actifs}  label="Vendeurs actifs"    sub={`${stats.boutiques_att} en attente`} color="text-success"/>
              <KPI icon="📦" val={stats.produits}         label="Produits publiés"   sub={`${stats.produits_att} en attente`}  color="text-blue-400"/>
              <KPI icon="⚖️" val={stats.litiges_ouverts}  label="Litiges ouverts"   color="text-red-400"/>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Admins list */}
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="font-syne font-bold text-sm">🛡️ Équipe Administrateurs</div>
                <Link to="/superadmin/admins" className="text-xs text-primary hover:underline">Gérer →</Link>
              </div>
              {admins.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-sm">
                  <div className="text-3xl mb-2 opacity-20">🛡️</div>
                  Aucun administrateur créé
                </div>
              ) : (
                admins.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                    <div className="w-8 h-8 bg-bg-3 rounded-xl flex items-center justify-center text-base">
                      {ROLE_ICONS[a.role] || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.nom_complet}</div>
                      <div className="text-xs text-white/30 truncate">{a.email}</div>
                    </div>
                    <span className={a.est_actif ? 'badge-green' : 'badge-red'}>
                      {a.est_actif ? '● Actif' : '● Inactif'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* System health */}
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
              <div className="font-syne font-bold text-sm mb-4">📊 Santé Système</div>
              <div className="space-y-3">
                {[
                  { label: '🗄️ Base de données',  badge: 'badge-green', txt: '● En ligne' },
                  { label: '📱 SMS OTP',           badge: 'badge-green', txt: '● Actif' },
                  { label: '💳 Paiements',          badge: 'badge-green', txt: '● Connecté' },
                  { label: '🔒 Sécurité',           badge: 'badge-green', txt: '● Optimal' },
                  { label: '📡 Sessions actives',   badge: 'badge-gold',  txt: `${stats?.sessions_actives || 0}` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-white/60">{item.label}</span>
                    <span className={item.badge}>{item.txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

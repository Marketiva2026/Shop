import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { sa } from '../../api/admin.api';
import { showToast } from '../../components/ui/Toast';

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

export default function SuperAdminClients() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    sa.getClients().then((r) => setUsers(r.data.users || [])).finally(() => setLoading(false));
  }, []);

  const handleSuspendre = async (u) => {
    if (!confirm(`${u.est_actif ? 'Suspendre' : 'Réactiver'} ${u.nom_complet} ?`)) return;
    try {
      await sa.suspendreClient(u.id);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, est_actif: !x.est_actif } : x));
      showToast(u.est_actif ? 'Compte suspendu' : 'Compte réactivé', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const filtered = users.filter((u) => {
    if (filter === 'client' && u.role !== 'client') return false;
    if (filter === 'vendeur' && u.role !== 'vendeur') return false;
    if (filter === 'suspended' && u.est_actif) return false;
    if (search && !u.nom_complet?.toLowerCase().includes(search.toLowerCase()) &&
        !u.email?.includes(search) && !u.telephone?.includes(search)) return false;
    return true;
  });

  const counts = {
    all: users.length,
    client: users.filter((u) => u.role === 'client').length,
    vendeur: users.filter((u) => u.role === 'vendeur').length,
    suspended: users.filter((u) => !u.est_actif).length,
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Super Administration" crown={true}/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div>
            <div className="font-syne font-bold">Clients & Vendeurs</div>
            <div className="text-[10px] text-white/30">{filtered.length} utilisateur(s)</div>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..." className="input-dark w-64 text-xs py-1.5"/>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'all',      label: 'Tous',     count: counts.all },
              { key: 'client',   label: 'Clients',  count: counts.client },
              { key: 'vendeur',  label: 'Vendeurs', count: counts.vendeur },
              { key: 'suspended',label: 'Suspendus',count: counts.suspended },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  filter === tab.key
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-bg-2 border-white/[0.06] text-white/50 hover:border-white/20'
                }`}>
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-primary/20' : 'bg-white/[0.06]'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-16 animate-pulse"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <div className="text-4xl mb-2 opacity-20">👥</div>
              <div>Aucun utilisateur trouvé</div>
            </div>
          ) : (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Utilisateur','Rôle','Contact','Inscription','Statut','Action'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]">
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium">{u.nom_complet}</div>
                        <div className="text-xs text-white/30 font-mono">#U{String(u.id).padStart(5, '0')}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={u.role === 'vendeur' ? 'badge-gold' : 'badge-blue'}>
                          {u.role === 'vendeur' ? '🏪 Vendeur' : '👤 Client'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-white/60">{u.email || '—'}</div>
                        <div className="text-xs text-white/30">{u.telephone || '—'}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-white/40">
                        {new Date(u.cree_le).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-4">
                        <span className={u.est_actif ? 'badge-green' : 'badge-red'}>
                          {u.est_actif ? '● Actif' : '● Suspendu'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => handleSuspendre(u)}
                          className={`text-xs hover:underline transition-colors ${u.est_actif ? 'text-red-400' : 'text-success'}`}>
                          {u.est_actif ? 'Suspendre' : 'Réactiver'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

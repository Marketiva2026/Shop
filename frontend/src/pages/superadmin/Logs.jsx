import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { sa } from '../../api/admin.api';

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

const ACTION_COLORS = {
  create: 'text-success', delete: 'text-red-400', update: 'text-blue-400',
  validate: 'text-success', reject: 'text-red-400', toggle: 'text-gold',
};

export default function SuperAdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  useEffect(() => {
    sa.getLogs().then((r) => setLogs(r.data.logs || [])).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) =>
    !filter || l.action?.includes(filter) || l.admin_nom?.toLowerCase().includes(filter.toLowerCase())
  );

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getActionColor = (action) => {
    for (const [key, cls] of Object.entries(ACTION_COLORS)) {
      if (action?.toLowerCase().includes(key)) return cls;
    }
    return 'text-white/60';
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Super Administration" crown={true}/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div>
            <div className="font-syne font-bold">Logs d'activité</div>
            <div className="text-[10px] text-white/30">{filtered.length} entrée(s)</div>
          </div>
          <input value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            placeholder="Filtrer par action ou admin..." className="input-dark w-64 text-xs py-1.5"/>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-2">{Array(8).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-xl h-12 animate-pulse"/>)}</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <div className="text-4xl mb-2 opacity-20">🔍</div>
              <div>Aucun log trouvé</div>
            </div>
          ) : (
            <>
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Date','Admin','Action','Détails','IP'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((l, i) => (
                      <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]">
                        <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap font-mono">
                          {new Date(l.cree_le).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium">{l.admin_nom || '—'}</div>
                          <div className="text-[10px] text-white/30">{l.admin_role || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono font-bold ${getActionColor(l.action)}`}>{l.action}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/50 max-w-[200px] truncate">
                          {l.details ? JSON.stringify(l.details) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-white/30 font-mono">{l.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs bg-bg-2 border border-white/[0.06] rounded-lg disabled:opacity-30 hover:border-white/20 transition-colors">
                    ← Préc.
                  </button>
                  <span className="text-xs text-white/40">Page {page} / {pages}</span>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                    className="px-3 py-1.5 text-xs bg-bg-2 border border-white/[0.06] rounded-lg disabled:opacity-30 hover:border-white/20 transition-colors">
                    Suiv. →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

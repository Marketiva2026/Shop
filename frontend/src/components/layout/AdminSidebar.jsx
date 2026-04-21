import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import { deconnexion } from '../../api/auth.api';

export default function AdminSidebar({ navItems, title = 'Administration', crown = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try { await deconnexion({ refreshToken: useAuthStore.getState().refreshToken }); } catch {}
    logout();
    navigate('/connexion');
  };

  return (
    <aside className="w-[250px] flex-shrink-0 bg-bg-2 border-r border-white/[0.06] flex flex-col fixed top-0 left-0 bottom-0 z-40">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="font-syne text-lg font-extrabold mb-2">
          <span className="text-primary">Market</span><span className="text-success">i</span>va
        </div>
        {crown && (
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-[10px] font-bold text-primary">
            👑 Super Administration
          </div>
        )}
        {!crown && (
          <div className="text-xs text-white/40 font-medium">{title}</div>
        )}
      </div>

      {/* User card */}
      <div className="mx-3 my-3 bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold font-syne text-sm flex-shrink-0">
          {user?.nom_complet?.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase() || 'SA'}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{user?.nom_complet}</div>
          <div className="text-[10px] text-primary font-medium">⚡ {user?.role?.replace(/_/g, ' ')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1">
        {navItems.map((section, si) => (
          <div key={si} className="mb-5">
            {section.label && (
              <div className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-2 mb-1.5">
                {section.label}
              </div>
            )}
            {section.items.map((item, ii) => {
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <Link key={ii} to={item.to}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium mb-0.5 transition-all relative
                    ${active ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-bg-3 hover:text-white'}`}>
                  {active && <span className="absolute left-0 top-[25%] bottom-[25%] w-[2.5px] rounded-r-sm bg-primary"/>}
                  <span className="text-[15px] w-4.5 text-center flex-shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-primary text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2.5 border-t border-white/[0.06]">
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[12px] text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <span className="text-base">🚪</span> Se déconnecter
        </button>
      </div>
    </aside>
  );
}

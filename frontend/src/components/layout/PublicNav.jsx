import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import useCartStore from '../../store/cart.store';
import { deconnexion } from '../../api/auth.api';

export default function PublicNav() {
  const { user, token, logout } = useAuthStore();
  const count = useCartStore((s) => s.count());
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explorer?q=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    try { await deconnexion({ refreshToken: useAuthStore.getState().refreshToken }); } catch {}
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0 font-syne text-xl font-extrabold tracking-tight">
          <span className="text-primary">Market</span><span className="text-success">i</span>va
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:flex">
          <div className="relative w-full">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full bg-bg-3 border border-white/[0.08] rounded-xl pl-4 pr-10 py-2.5 text-sm
                         text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-primary transition-colors">
              🔍
            </button>
          </div>
        </form>

        {/* Right */}
        <div className="flex items-center gap-2 ml-auto">
          <Link to="/panier" className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-bg-3 border border-white/[0.08] text-sm hover:border-white/20 transition-colors">
            🛒
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          {token && user ? (
            <div className="flex items-center gap-2">
              <Link to={user.role === 'vendeur' ? '/vendeur' : user.role?.startsWith('admin') || user.role === 'super_admin' ? '/superadmin' : '/profil'}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors truncate max-w-[100px]">
                {user.nom_complet?.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="text-xs text-white/30 hover:text-red-400 transition-colors">
                Déco
              </button>
            </div>
          ) : (
            <Link to="/connexion" className="btn-primary text-xs px-4 py-2">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

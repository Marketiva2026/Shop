import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import useAuthStore from '../../store/auth.store';
import api from '../../api/axios.config';
import { showToast } from '../../components/ui/Toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ nom_complet: '', email: '', adresse: '', ville: '' });
  const [loading, setLoading] = useState(false);
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '' });

  useEffect(() => {
    api.get('/user/profil').then((r) => {
      const u = r.data.user;
      setForm({ nom_complet: u.nom_complet || '', email: u.email || '', adresse: u.adresse || '', ville: u.ville || '' });
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/user/profil', form);
      updateUser(form);
      showToast('✅ Profil mis à jour', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    } finally { setLoading(false); }
  };

  const handleMdp = async (e) => {
    e.preventDefault();
    if (mdp.nouveau.length < 8) { showToast('Minimum 8 caractères.', 'error'); return; }
    try {
      await api.put('/user/mot-de-passe', mdp);
      showToast('✅ Mot de passe mis à jour', 'success');
      setMdp({ ancien: '', nouveau: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-syne text-2xl font-bold mb-6">Mon profil</h1>

        <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold font-syne text-xl">
              {user?.nom_complet?.[0] || '?'}
            </div>
            <div>
              <div className="font-bold">{user?.nom_complet}</div>
              <div className="text-xs text-primary font-medium capitalize">{user?.role}</div>
              {user?.code_parrainage && (
                <div className="text-xs text-white/40 mt-0.5">Code : <span className="text-white/70 font-mono">{user.code_parrainage}</span></div>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Nom complet</label>
                <input value={form.nom_complet} onChange={(e) => setForm({ ...form, nom_complet: e.target.value })} className="input-dark"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="input-dark"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Adresse</label>
                <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="input-dark"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Ville</label>
                <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className="input-dark"/>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '...' : 'Sauvegarder'}
            </button>
          </form>
        </div>

        <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6">
          <div className="font-syne font-bold mb-4 text-sm">🔒 Changer le mot de passe</div>
          <form onSubmit={handleMdp} className="space-y-3">
            <input value={mdp.ancien} onChange={(e) => setMdp({ ...mdp, ancien: e.target.value })}
              type="password" placeholder="Mot de passe actuel" required className="input-dark"/>
            <input value={mdp.nouveau} onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })}
              type="password" placeholder="Nouveau mot de passe (min. 8 car.)" required className="input-dark"/>
            <button type="submit" className="btn-secondary">Changer le mot de passe</button>
          </form>
        </div>
      </div>
    </div>
  );
}

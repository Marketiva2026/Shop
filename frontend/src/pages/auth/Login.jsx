import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { connexion } from '../../api/auth.api';
import useAuthStore from '../../store/auth.store';

const REDIRECTS = {
  super_admin: '/superadmin',
  admin_support: '/admin/support',
  admin_finances: '/admin/finances',
  admin_vendeurs: '/admin/vendeurs',
  admin_contenu: '/admin/contenu',
  admin_logistique: '/admin/logistique',
  admin_marketing: '/admin/marketing',
  agent_relais: '/admin',
  vendeur: '/vendeur',
  client: '/',
};

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await connexion({ identifiant: data.identifiant, mot_de_passe: data.mot_de_passe });
      const { token, refreshToken, user } = res.data;
      login(user, token, refreshToken);
      const from = location.state?.from?.pathname;
      navigate(from || REDIRECTS[user.role] || '/', { replace: true });
    } catch (err) {
      const d = err.response?.data;
      if (d?.action === 'otp') {
        navigate('/verifier-otp', { state: { telephone: d.telephone, type: 'connexion', otp_demo: d.otp_demo } });
      } else {
        setError(d?.message || 'Erreur de connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-bg-2 to-bg-base border-r border-white/[0.06] flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,72,34,0.08),transparent_70%)]"/>
        <div className="relative text-center">
          <div className="font-syne text-6xl font-extrabold mb-4">
            <span className="text-primary">Market</span><span className="text-success">i</span>va
          </div>
          <div className="text-white/50 text-lg mb-12">La marketplace de référence en Côte d'Ivoire</div>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm">
            {['🏪 Des milliers de boutiques', '💳 Paiement Mobile Money', '📦 Livraison partout en CI', '🛡️ Achat 100% sécurisé'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <div className="font-syne text-2xl font-bold mb-1">Connexion</div>
            <div className="text-white/40 text-sm">Entrez vos identifiants pour accéder à votre espace</div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Téléphone ou Email</label>
              <input
                {...register('identifiant', { required: 'Identifiant requis.' })}
                placeholder="+225 07 XX XX XX XX"
                className="input-dark"
              />
              {errors.identifiant && <p className="text-red-400 text-xs mt-1">{errors.identifiant.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  {...register('mot_de_passe', { required: 'Mot de passe requis.' })}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  className="input-dark pr-11"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-sm">
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.mot_de_passe && <p className="text-red-400 text-xs mt-1">{errors.mot_de_passe.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/mot-de-passe-oublie" className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base">
              {loading ? '...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/40">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary hover:underline font-medium">S'inscrire</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

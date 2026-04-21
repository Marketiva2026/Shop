import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifierOtp, renvoyerOtp } from '../../api/auth.api';
import OTPInput from '../../components/ui/OTPInput';
import useAuthStore from '../../store/auth.store';

export default function OTPVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const state = location.state || {};
  const { telephone, type = 'inscription', otp_demo } = state;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!telephone) { navigate('/connexion'); return; }
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (code.length < 6) { setError('Entrez les 6 chiffres.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await verifierOtp({ telephone, code, type });
      const { token, refreshToken, user } = res.data;
      login(user, token, refreshToken);
      navigate(user.role === 'vendeur' ? '/vendeur' : user.role === 'super_admin' ? '/superadmin' : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await renvoyerOtp({ telephone, type });
      setCountdown(60);
      setError('');
    } catch {
      setError('Impossible de renvoyer. Réessayez.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] text-center">
        <div className="font-syne text-3xl font-extrabold mb-2">
          <span className="text-primary">Market</span><span className="text-success">i</span>va
        </div>
        <div className="text-5xl mb-6 mt-4">📱</div>
        <h1 className="font-syne text-xl font-bold mb-2">Vérification SMS</h1>
        <p className="text-white/50 text-sm mb-1">Code envoyé au</p>
        <p className="text-white font-semibold mb-6">{telephone}</p>

        {otp_demo && (
          <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-2.5 text-gold text-sm mb-6">
            🚧 Mode démo — Code: <strong className="text-lg tracking-widest">{otp_demo}</strong>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <OTPInput length={6} onChange={setCode}/>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading || code.length < 6}
            className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
            {loading ? 'Vérification...' : 'Confirmer le code'}
          </button>
        </form>

        <div className="mt-6 text-sm text-white/40">
          {countdown > 0 ? (
            <span>Renvoyer dans {countdown}s</span>
          ) : (
            <button onClick={handleResend} disabled={resending}
              className="text-primary hover:underline disabled:opacity-50">
              {resending ? 'Envoi...' : 'Renvoyer le code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

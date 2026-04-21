import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motDePasseOublie, reinitialiserMdp } from '../../api/auth.api';
import OTPInput from '../../components/ui/OTPInput';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1); // 1=tel, 2=otp+mdp
  const [telephone, setTelephone] = useState('');
  const [code, setCode]         = useState('');
  const [nouveau, setNouveau]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [otpDemo, setOtpDemo]   = useState(null);

  const handleStep1 = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await motDePasseOublie({ telephone });
      if (r.data.otp_demo) setOtpDemo(r.data.otp_demo);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    } finally { setLoading(false); }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    if (code.length < 6) { setError('Entrez le code à 6 chiffres.'); return; }
    if (nouveau.length < 8) { setError('Mot de passe : minimum 8 caractères.'); return; }
    setLoading(true); setError('');
    try {
      await reinitialiserMdp({ telephone, code, nouveau_mot_de_passe: nouveau });
      navigate('/connexion', { state: { message: 'Mot de passe réinitialisé. Connectez-vous.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link to="/" className="font-syne text-2xl font-extrabold">
            <span className="text-primary">Market</span><span className="text-success">i</span>va
          </Link>
          <div className="text-white/40 text-sm mt-2">
            {step === 1 ? 'Réinitialiser le mot de passe' : 'Nouveau mot de passe'}
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Numéro de téléphone</label>
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)}
                type="tel" placeholder="+225 07 XX XX XX XX" required className="input-dark"/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? '...' : 'Recevoir le code OTP'}
            </button>
            <div className="text-center"><Link to="/connexion" className="text-sm text-white/40 hover:text-white">← Retour</Link></div>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="space-y-5">
            {otpDemo && (
              <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-2.5 text-gold text-sm text-center">
                🚧 Demo — Code : <strong className="tracking-widest">{otpDemo}</strong>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-3 text-center">Code OTP reçu par SMS</label>
              <OTPInput length={6} onChange={setCode}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Nouveau mot de passe</label>
              <input value={nouveau} onChange={(e) => setNouveau(e.target.value)}
                type="password" placeholder="Minimum 8 caractères" required className="input-dark"/>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? '...' : 'Réinitialiser'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

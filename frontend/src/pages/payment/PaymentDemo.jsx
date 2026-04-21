import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmerDemo } from '../../api/order.api';
import { showToast } from '../../components/ui/Toast';

export default function PaymentDemo() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get('ref');
  const cmdId = params.get('cmd');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('idle');

  const handleConfirm = async () => {
    setLoading(true);
    setStep('processing');
    try {
      await new Promise((r) => setTimeout(r, 2000));
      await confirmerDemo({ transaction_id: ref });
      setStep('success');
      showToast('✅ Paiement simulé avec succès', 'success');
      setTimeout(() => navigate(`/paiement/retour?reference=${ref}`), 1500);
    } catch (err) {
      setStep('idle');
      showToast(err.response?.data?.message || 'Erreur simulation.', 'error');
    } finally { setLoading(false); }
  };

  const handleFail = async () => {
    setStep('failed');
    await new Promise((r) => setTimeout(r, 1000));
    navigate(`/paiement/retour?reference=${ref}`);
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      {/* Dev mode banner */}
      <div className="fixed top-0 left-0 right-0 bg-gold text-bg-base text-xs font-bold text-center py-2 z-50">
        🧪 MODE DÉVELOPPEMENT — Simulation de paiement CinetPay
      </div>

      <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-8 max-w-sm w-full text-center mt-8">
        {step === 'idle' && (
          <>
            <div className="text-5xl mb-4">💳</div>
            <div className="font-syne text-xl font-bold mb-1">Paiement simulé</div>
            <div className="text-white/40 text-sm mb-1">Référence transaction</div>
            <div className="font-mono text-xs text-primary bg-bg-3 rounded-lg px-3 py-2 mb-6 break-all">{ref}</div>

            <div className="bg-bg-3 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
              {[
                { label: 'Réseau', value: 'MTN MoMo (simulé)' },
                { label: 'Numéro', value: '+225 07 00 00 00 00' },
                { label: 'Statut', value: 'En attente de confirmation' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-white/40">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button onClick={handleConfirm} disabled={loading}
                className="btn-primary w-full justify-center py-3">
                ✅ Confirmer le paiement
              </button>
              <button onClick={handleFail} disabled={loading}
                className="btn-danger w-full justify-center py-3">
                ❌ Simuler un échec
              </button>
            </div>

            <p className="text-[10px] text-white/20 mt-4">
              Cette page n'apparaît qu'en mode développement
            </p>
          </>
        )}

        {step === 'processing' && (
          <>
            <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"/>
            <div className="font-syne text-lg font-bold mb-1">Traitement en cours…</div>
            <div className="text-white/40 text-sm">Simulation du paiement mobile money</div>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <div className="font-syne text-xl font-bold text-success">Paiement confirmé !</div>
            <div className="text-white/40 text-sm mt-2">Redirection en cours…</div>
          </>
        )}

        {step === 'failed' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <div className="font-syne text-xl font-bold text-red-400">Échec simulé</div>
            <div className="text-white/40 text-sm mt-2">Redirection en cours…</div>
          </>
        )}
      </div>
    </div>
  );
}

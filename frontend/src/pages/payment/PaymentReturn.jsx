import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { statutPaiement } from '../../api/order.api';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get('reference') || params.get('ref');
  const [status, setStatus] = useState('checking');
  const [paiement, setPaiement] = useState(null);

  useEffect(() => {
    if (!reference) { setStatus('error'); return; }

    let attempts = 0;
    const poll = async () => {
      try {
        const res = await statutPaiement(reference);
        const p = res.data.paiement;
        setPaiement(p);
        if (p.statut === 'capture' || p.statut === 'libere') {
          setStatus('success');
        } else if (p.statut === 'echec') {
          setStatus('failed');
        } else if (attempts < 6) {
          attempts++;
          setTimeout(poll, 3000);
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('error');
      }
    };
    poll();
  }, [reference]);

  const icons = {
    checking: <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>,
    success:  <div className="text-7xl">✅</div>,
    pending:  <div className="text-7xl">⏳</div>,
    failed:   <div className="text-7xl">❌</div>,
    error:    <div className="text-7xl">⚠️</div>,
  };

  const messages = {
    checking: { title: 'Vérification en cours…', sub: 'Nous confirmons votre paiement.', color: 'text-white' },
    success:  { title: 'Paiement confirmé !', sub: 'Votre commande est en cours de traitement.', color: 'text-success' },
    pending:  { title: 'Paiement en attente', sub: 'Le paiement est en cours de validation.', color: 'text-gold' },
    failed:   { title: 'Paiement échoué', sub: 'Le paiement n\'a pas abouti. Réessayez.', color: 'text-red-400' },
    error:    { title: 'Erreur', sub: 'Une erreur est survenue. Vérifiez vos commandes.', color: 'text-red-400' },
  };

  const msg = messages[status];

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-10 text-center max-w-md w-full">
        <div className="mb-6">{icons[status]}</div>

        <div className={`font-syne text-2xl font-bold mb-2 ${msg.color}`}>{msg.title}</div>
        <div className="text-white/50 text-sm mb-6">{msg.sub}</div>

        {paiement && status === 'success' && (
          <div className="bg-bg-3 rounded-xl p-4 text-sm text-left space-y-1.5 mb-6">
            <div className="flex justify-between">
              <span className="text-white/40">Commande</span>
              <span className="font-mono font-bold text-primary">{paiement.commande_ref}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Montant</span>
              <span className="font-bold">{Number(paiement.montant).toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Méthode</span>
              <span>{paiement.methode}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {status === 'success' && (
            <Link to="/commandes" className="btn-primary justify-center">Voir mes commandes →</Link>
          )}
          {status === 'failed' && (
            <button onClick={() => navigate(-1)} className="btn-primary justify-center">← Réessayer</button>
          )}
          <Link to="/" className="btn-secondary justify-center">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}

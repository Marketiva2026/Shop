import { useState, useEffect } from 'react';
import PublicNav from '../../components/layout/PublicNav';
import api from '../../api/axios.config';

const TYPE_LABELS = {
  gain_parrainage:      { label: 'Gain parrainage',   icon: '🎁', color: 'text-success' },
  gain_cashback:        { label: 'Cashback',           icon: '💰', color: 'text-success' },
  utilisation_commande: { label: 'Utilisé commande',  icon: '🛒', color: 'text-red-400' },
  bonus_inscription:    { label: 'Bonus inscription', icon: '🎉', color: 'text-gold' },
  remboursement:        { label: 'Remboursement',     icon: '↩️', color: 'text-blue-400' },
};

export default function Wallet() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/user/wallet').then((r) => setData(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-syne text-2xl font-bold mb-6">Mon Wallet</h1>

        <div className="bg-gradient-to-br from-primary/10 to-bg-2 border border-primary/20 rounded-2xl p-6 mb-6 text-center">
          <div className="text-white/50 text-sm mb-1">Solde actuel</div>
          <div className="font-syne text-4xl font-extrabold text-primary">
            {(data?.points || 0).toLocaleString()} pts
          </div>
          <div className="text-xs text-white/30 mt-2">≈ {Math.floor((data?.points || 0) / 10)} FCFA de réduction</div>
        </div>

        <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="font-syne font-bold text-sm">Historique des transactions</div>
          </div>
          {!data?.transactions?.length ? (
            <div className="text-center py-12 text-white/30 text-sm">Aucune transaction</div>
          ) : (
            data.transactions.map((tx) => {
              const info = TYPE_LABELS[tx.type] || { label: tx.type, icon: '•', color: 'text-white' };
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0">
                  <div className="w-8 h-8 bg-bg-3 rounded-xl flex items-center justify-center text-base">{info.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{tx.description || info.label}</div>
                    <div className="text-xs text-white/30">{new Date(tx.cree_le).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className={`font-bold text-sm ${tx.points > 0 ? 'text-success' : 'text-red-400'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

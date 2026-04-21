import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import { mesCommandes, annulerCommande } from '../../api/order.api';
import { showToast } from '../../components/ui/Toast';

const STATUT_LABELS = {
  en_attente_paiement: { label: 'Attente paiement', cls: 'badge-orange' },
  payee:               { label: 'Payée',             cls: 'badge-green'  },
  en_preparation:      { label: 'En préparation',    cls: 'badge-blue'   },
  expediee:            { label: 'Expédiée',          cls: 'badge-blue'   },
  au_relais:           { label: 'Au relais',         cls: 'badge-gold'   },
  livree:              { label: 'Livrée ✓',          cls: 'badge-green'  },
  annulee:             { label: 'Annulée',           cls: 'badge-red'    },
  remboursee:          { label: 'Remboursée',        cls: 'badge-blue'   },
};

export default function Orders() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mesCommandes().then((r) => setCommandes(r.data.commandes || [])).finally(() => setLoading(false));
  }, []);

  const handleAnnuler = async (id) => {
    if (!confirm('Annuler cette commande ?')) return;
    try {
      await annulerCommande(id);
      setCommandes((prev) => prev.map((c) => c.id === id ? { ...c, statut: 'annulee' } : c));
      showToast('✅ Commande annulée', 'success');
    } catch { showToast('Impossible d\'annuler.', 'error'); }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-syne text-2xl font-bold mb-6">Mes commandes</h1>

        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-24 animate-pulse"/>)}
          </div>
        ) : commandes.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <div className="text-6xl mb-3 opacity-20">🛒</div>
            <div className="font-syne font-bold">Aucune commande</div>
            <Link to="/explorer" className="btn-primary mt-4 inline-flex">Explorer les produits</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {commandes.map((c) => {
              const s = STATUT_LABELS[c.statut] || { label: c.statut, cls: 'badge-blue' };
              return (
                <div key={c.id} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="font-syne font-bold text-primary text-sm">{c.reference}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {new Date(c.date_commande).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold">{Number(c.montant_total).toLocaleString()} FCFA</div>
                    <div className="flex gap-2">
                      {c.statut === 'en_attente_paiement' && (
                        <button onClick={() => handleAnnuler(c.id)} className="text-xs text-red-400 hover:underline">Annuler</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

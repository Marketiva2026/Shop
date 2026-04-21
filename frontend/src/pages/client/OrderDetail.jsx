import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import { getCommande, confirmerReception, annulerCommande, ouvrirLitige } from '../../api/order.api';
import { showToast } from '../../components/ui/Toast';

const STATUTS = [
  { key: 'en_attente_paiement', label: 'En attente de paiement', icon: '⏳' },
  { key: 'payee',               label: 'Payée',                  icon: '✅' },
  { key: 'en_preparation',      label: 'En préparation',         icon: '📦' },
  { key: 'expediee',            label: 'Expédiée',               icon: '🚚' },
  { key: 'au_relais',           label: 'Au point relais',        icon: '📍' },
  { key: 'livree',              label: 'Livrée',                 icon: '🏠' },
  { key: 'annulee',             label: 'Annulée',                icon: '❌' },
];

const STATUT_COLORS = {
  en_attente_paiement: 'badge-gold', payee: 'badge-blue', en_preparation: 'badge-blue',
  expediee: 'badge-blue', au_relais: 'badge-gold', livree: 'badge-green', annulee: 'badge-red',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showLitige, setShowLitige] = useState(false);
  const [litigeForm, setLitigeForm] = useState({ motif: '', description: '' });

  const load = () => {
    getCommande(id).then((r) => setData(r.data)).catch(() => navigate('/commandes')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleConfirmer = async () => {
    if (!confirm('Confirmer la réception de votre commande ? Le vendeur sera payé.')) return;
    setActionLoading(true);
    try {
      await confirmerReception(id);
      showToast('✅ Réception confirmée. Merci !', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleAnnuler = async () => {
    if (!confirm('Annuler cette commande ?')) return;
    setActionLoading(true);
    try {
      await annulerCommande(id);
      showToast('Commande annulée.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleLitige = async (e) => {
    e.preventDefault();
    try {
      await ouvrirLitige(id, litigeForm);
      showToast('⚖️ Litige ouvert. Notre équipe vous contactera.', 'success');
      setShowLitige(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {Array(3).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-28 animate-pulse"/>)}
      </div>
    </div>
  );

  if (!data) return null;

  const { commande, items = [], paiement } = data;
  const statutIdx = STATUTS.findIndex((s) => s.key === commande.statut);
  const activeStatuts = STATUTS.filter((s) => !['annulee'].includes(s.key));

  const canConfirm = ['expediee', 'au_relais', 'livree'].includes(commande.statut) && !paiement?.escrow_libere;
  const canCancel = ['en_attente_paiement', 'payee'].includes(commande.statut);
  const canLitige = ['livree', 'au_relais', 'expediee'].includes(commande.statut);

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/commandes" className="text-white/30 hover:text-white text-sm transition-colors">← Mes commandes</Link>
        </div>

        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-syne text-xl font-bold font-mono">{commande.reference}</div>
            <div className="text-xs text-white/40 mt-1">
              {new Date(commande.date_commande).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <span className={`${STATUT_COLORS[commande.statut] || 'badge-blue'} text-sm px-3 py-1`}>
            {STATUTS.find((s) => s.key === commande.statut)?.label || commande.statut}
          </span>
        </div>

        {/* Progress tracker */}
        {commande.statut !== 'annulee' && (
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5 mb-5">
            <div className="text-xs text-white/40 mb-4 font-medium">Suivi de commande</div>
            <div className="flex items-center justify-between">
              {activeStatuts.map((s, i) => {
                const done = STATUTS.findIndex((x) => x.key === commande.statut) >= STATUTS.findIndex((x) => x.key === s.key);
                const active = s.key === commande.statut;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                        done ? 'bg-success/20 border-success text-success' :
                        active ? 'bg-primary/20 border-primary text-primary' :
                        'border-white/20 text-white/20'
                      }`}>{s.icon}</div>
                      <div className={`text-[9px] mt-1 text-center w-12 leading-tight hidden sm:block ${done ? 'text-success/80' : active ? 'text-primary/80' : 'text-white/20'}`}>
                        {s.label}
                      </div>
                    </div>
                    {i < activeStatuts.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 transition-all ${done && i < statutIdx - 1 ? 'bg-success' : 'bg-white/10'}`}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Code retrait */}
        {commande.statut === 'au_relais' && commande.code_retrait && (
          <div className="bg-gold/10 border border-gold/20 rounded-xl px-5 py-4 mb-5 flex items-center gap-4">
            <div className="text-3xl">📍</div>
            <div>
              <div className="text-xs text-gold/70 mb-1">Code de retrait au point relais</div>
              <div className="font-syne text-3xl font-extrabold text-gold tracking-widest">{commande.code_retrait}</div>
              <div className="text-xs text-white/30 mt-1">Présentez ce code au point relais pour récupérer votre colis</div>
            </div>
          </div>
        )}

        {/* Actions */}
        {(canConfirm || canCancel || canLitige) && (
          <div className="flex flex-wrap gap-3 mb-5">
            {canConfirm && (
              <button onClick={handleConfirmer} disabled={actionLoading}
                className="btn-primary">
                ✅ Confirmer la réception
              </button>
            )}
            {canLitige && (
              <button onClick={() => setShowLitige(true)}
                className="btn-secondary">
                ⚖️ Ouvrir un litige
              </button>
            )}
            {canCancel && (
              <button onClick={handleAnnuler} disabled={actionLoading}
                className="btn-danger">
                ❌ Annuler
              </button>
            )}
          </div>
        )}

        {/* Litige modal */}
        {showLitige && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 w-full max-w-md">
              <div className="font-syne font-bold mb-4">⚖️ Ouvrir un litige</div>
              <form onSubmit={handleLitige} className="space-y-3">
                <select value={litigeForm.motif} onChange={(e) => setLitigeForm({ ...litigeForm, motif: e.target.value })}
                  required className="input-dark">
                  <option value="">Motif *</option>
                  <option value="non_recu">Commande non reçue</option>
                  <option value="produit_endommage">Produit endommagé</option>
                  <option value="produit_non_conforme">Produit non conforme</option>
                  <option value="autre">Autre</option>
                </select>
                <textarea value={litigeForm.description} onChange={(e) => setLitigeForm({ ...litigeForm, description: e.target.value })}
                  placeholder="Décrivez le problème en détail..." rows={4} required
                  className="input-dark resize-none"/>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">Soumettre</button>
                  <button type="button" onClick={() => setShowLitige(false)} className="btn-secondary flex-1">Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-white/[0.06] font-syne font-bold text-sm">Articles ({items.length})</div>
          {items.map((item, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < items.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
              <div className="w-12 h-12 bg-bg-3 rounded-xl overflow-hidden flex-shrink-0">
                {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl opacity-20">📦</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.nom_produit}</div>
                <div className="text-xs text-white/40 mt-0.5">×{item.quantite} · {Number(item.prix_unitaire).toLocaleString()} FCFA/unité</div>
              </div>
              <div className="font-bold text-sm">{Number(item.sous_total).toLocaleString()} F</div>
            </div>
          ))}
        </div>

        {/* Totals + Payment */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
            <div className="font-syne font-bold text-sm mb-3">Récapitulatif</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-white/50">
                <span>Produits</span>
                <span>{Number(commande.montant_produits).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Livraison</span>
                <span>{Number(commande.frais_livraison).toLocaleString()} F</span>
              </div>
              {commande.reduction_wallet > 0 && (
                <div className="flex justify-between text-success text-xs">
                  <span>Réduction points</span>
                  <span>−{Number(commande.reduction_wallet).toLocaleString()} F</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-white/[0.06]">
                <span>Total</span>
                <span className="text-primary">{Number(commande.montant_total).toLocaleString()} F</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
            <div className="font-syne font-bold text-sm mb-3">Paiement</div>
            {paiement ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Méthode</span>
                  <span>{paiement.methode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Statut</span>
                  <span className={paiement.statut === 'capture' || paiement.statut === 'libere' ? 'text-success font-bold' : 'text-gold'}>
                    {paiement.statut === 'capture' || paiement.statut === 'libere' ? '● Payé' : '⏳ En attente'}
                  </span>
                </div>
                {paiement.date_paiement && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Date</span>
                    <span className="text-xs">{new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white/30 text-sm">En attente de paiement</div>
            )}

            {commande.statut === 'en_attente_paiement' && (
              <Link to={`/checkout?retry=${id}`} className="btn-primary w-full justify-center mt-3 text-sm">
                💳 Payer maintenant
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

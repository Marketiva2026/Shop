import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';
import api from '../../api/axios.config';
import { creerCommande, initierPaiement } from '../../api/order.api';
import { showToast } from '../../components/ui/Toast';

const METHODES = [
  { value: 'MOBILE_MONEY', label: 'Mobile Money', sub: 'MTN, Orange, Moov, Wave', icon: '📱' },
  { value: 'CREDIT_CARD',  label: 'Carte bancaire', sub: 'Visa / Mastercard', icon: '💳' },
];

const STEPS = ['Livraison', 'Paiement', 'Confirmation'];

export default function Checkout() {
  const { items, total, clear } = useCartStore();
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 — livraison
  const [modeLivraison, setModeLivraison] = useState('point_relais');
  const [relais, setRelais] = useState([]);
  const [relaisId, setRelaisId] = useState('');
  const [adresses, setAdresses] = useState([]);
  const [adresseId, setAdresseId] = useState('');
  const [newAddr, setNewAddr] = useState({ nom_complet: '', telephone: '', ligne1: '', commune: '', ville: 'Abidjan' });
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [utilisPoints, setUtilisPoints] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  // Step 1 — paiement
  const [methode, setMethode] = useState('MOBILE_MONEY');

  // Step 2 — confirm
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!token) { navigate('/connexion'); return; }
    if (!items.length) { navigate('/panier'); return; }
    Promise.all([
      api.get('/commandes/relais'),
      api.get('/user/adresses'),
      api.get('/user/profil'),
    ]).then(([r, a, p]) => {
      setRelais(r.data.relais || []);
      setAdresses(a.data.adresses || []);
      setUserPoints(p.data.user?.points_wallet || 0);
      const def = a.data.adresses?.find((x) => x.est_defaut);
      if (def) setAdresseId(String(def.id));
    }).catch(() => {});
  }, []);

  const frais = 1500;
  const sousTotal = total();
  const reduction = utilisPoints ? Math.min(userPoints, sousTotal * 0.1) : 0;
  const montantTotal = sousTotal + frais - reduction;

  const handleAddAddr = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/user/adresses', { ...newAddr, est_defaut: !adresses.length });
      setAdresses((prev) => [...prev, r.data.adresse || { ...newAddr, id: Date.now() }]);
      setShowNewAddr(false);
      showToast('✅ Adresse ajoutée', 'success');
    } catch { showToast('Erreur ajout adresse.', 'error'); }
  };

  const handleCommander = async () => {
    if (modeLivraison === 'point_relais' && !relaisId) {
      showToast('Choisissez un point relais.', 'error'); return;
    }
    if (modeLivraison === 'domicile' && !adresseId) {
      showToast('Choisissez une adresse.', 'error'); return;
    }
    setLoading(true);
    try {
      const cmdRes = await creerCommande({
        items: items.map((i) => ({ produit_id: i.produit_id, quantite: i.quantite })),
        mode_livraison: modeLivraison,
        adresse_id: modeLivraison === 'domicile' ? Number(adresseId) : null,
        relais_id: modeLivraison === 'point_relais' ? Number(relaisId) : null,
        methode_paiement: methode === 'MOBILE_MONEY' ? 'mtn_momo' : 'carte',
        utiliser_points: utilisPoints,
        notes: notes || null,
      });

      const { commande_id } = cmdRes.data;

      const payRes = await initierPaiement({ commande_id, methode });

      clear();

      if (payRes.data.demo) {
        navigate(`/paiement/demo?ref=${payRes.data.transaction_id}&cmd=${commande_id}`);
      } else {
        window.location.href = payRes.data.payment_url;
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la commande.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 cursor-pointer ${i <= step ? 'text-white' : 'text-white/30'}`}
                onClick={() => i < step && setStep(i)}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  i < step ? 'bg-success border-success text-white' :
                  i === step ? 'bg-primary border-primary text-white' :
                  'border-white/20 text-white/30'
                }`}>{i < step ? '✓' : i + 1}</div>
                <span className="text-sm font-medium hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-8 sm:w-16 transition-all ${i < step ? 'bg-success' : 'bg-white/10'}`}/>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main panel */}
          <div className="lg:col-span-2">
            {/* STEP 0 — Livraison */}
            {step === 0 && (
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6">
                <div className="font-syne font-bold text-base mb-5">🚚 Mode de livraison</div>

                <div className="flex gap-3 mb-6">
                  {[
                    { value: 'point_relais', label: 'Point relais', icon: '📍' },
                    { value: 'domicile', label: 'À domicile', icon: '🏠' },
                  ].map((m) => (
                    <button key={m.value} onClick={() => setModeLivraison(m.value)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        modeLivraison === m.value
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-bg-3 border-white/[0.06] text-white/60 hover:border-white/20'
                      }`}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {modeLivraison === 'point_relais' ? (
                  <div className="space-y-2">
                    <div className="text-xs text-white/40 mb-3">Sélectionnez un point de retrait :</div>
                    {relais.length === 0 ? (
                      <div className="text-center py-8 text-white/30 text-sm">Aucun point relais disponible</div>
                    ) : relais.map((r) => (
                      <label key={r.id} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        String(relaisId) === String(r.id)
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-white/[0.06] bg-bg-3 hover:border-white/20'
                      }`}>
                        <input type="radio" name="relais" value={r.id}
                          checked={String(relaisId) === String(r.id)}
                          onChange={() => setRelaisId(String(r.id))}
                          className="mt-0.5 accent-primary"/>
                        <div>
                          <div className="text-sm font-medium">{r.nom}</div>
                          <div className="text-xs text-white/40 mt-0.5">{r.adresse}, {r.commune || r.ville}</div>
                          {r.telephone && <div className="text-xs text-white/30">{r.telephone}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-white/40 mb-3">Sélectionnez une adresse :</div>
                    {adresses.map((a) => (
                      <label key={a.id} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        String(adresseId) === String(a.id)
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-white/[0.06] bg-bg-3 hover:border-white/20'
                      }`}>
                        <input type="radio" name="adresse" value={a.id}
                          checked={String(adresseId) === String(a.id)}
                          onChange={() => setAdresseId(String(a.id))}
                          className="mt-0.5 accent-primary"/>
                        <div>
                          <div className="text-sm font-medium">{a.label || 'Adresse'}</div>
                          <div className="text-xs text-white/50">{a.nom_complet} · {a.telephone}</div>
                          <div className="text-xs text-white/40 mt-0.5">{a.ligne1}, {a.commune}, {a.ville}</div>
                        </div>
                      </label>
                    ))}

                    {!showNewAddr ? (
                      <button onClick={() => setShowNewAddr(true)}
                        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-sm text-white/40 hover:border-primary/40 hover:text-primary transition-all">
                        + Ajouter une adresse
                      </button>
                    ) : (
                      <form onSubmit={handleAddAddr} className="bg-bg-3 border border-white/[0.06] rounded-xl p-4 space-y-3">
                        <div className="text-xs text-white/40 font-medium">Nouvelle adresse</div>
                        <div className="grid grid-cols-2 gap-3">
                          <input value={newAddr.nom_complet} onChange={(e) => setNewAddr({ ...newAddr, nom_complet: e.target.value })}
                            placeholder="Nom complet *" required className="input-dark col-span-2 text-sm py-2"/>
                          <input value={newAddr.telephone} onChange={(e) => setNewAddr({ ...newAddr, telephone: e.target.value })}
                            placeholder="Téléphone *" required className="input-dark text-sm py-2"/>
                          <input value={newAddr.commune} onChange={(e) => setNewAddr({ ...newAddr, commune: e.target.value })}
                            placeholder="Commune *" required className="input-dark text-sm py-2"/>
                          <input value={newAddr.ligne1} onChange={(e) => setNewAddr({ ...newAddr, ligne1: e.target.value })}
                            placeholder="Adresse *" required className="input-dark col-span-2 text-sm py-2"/>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary text-xs px-4 py-2">Sauvegarder</button>
                          <button type="button" onClick={() => setShowNewAddr(false)} className="btn-secondary text-xs px-4 py-2">Annuler</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {userPoints > 0 && (
                  <label className="flex items-center gap-3 mt-5 pt-5 border-t border-white/[0.06] cursor-pointer">
                    <input type="checkbox" checked={utilisPoints} onChange={(e) => setUtilisPoints(e.target.checked)}
                      className="w-4 h-4 accent-primary"/>
                    <div>
                      <div className="text-sm font-medium">Utiliser mes points wallet</div>
                      <div className="text-xs text-white/40">
                        {userPoints.toLocaleString()} pts disponibles · réduction estimée : {Math.round(Math.min(userPoints, sousTotal * 0.1)).toLocaleString()} FCFA
                      </div>
                    </div>
                  </label>
                )}

                <button onClick={() => setStep(1)}
                  disabled={modeLivraison === 'point_relais' ? !relaisId : !adresseId}
                  className="btn-primary w-full justify-center mt-6 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
                  Continuer →
                </button>
              </div>
            )}

            {/* STEP 1 — Méthode de paiement */}
            {step === 1 && (
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6">
                <div className="font-syne font-bold text-base mb-5">💳 Méthode de paiement</div>

                <div className="space-y-3 mb-6">
                  {METHODES.map((m) => (
                    <label key={m.value} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      methode === m.value
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-white/[0.06] bg-bg-3 hover:border-white/20'
                    }`}>
                      <input type="radio" name="methode" value={m.value}
                        checked={methode === m.value} onChange={() => setMethode(m.value)}
                        className="accent-primary"/>
                      <div className="text-2xl">{m.icon}</div>
                      <div>
                        <div className="font-medium text-sm">{m.label}</div>
                        <div className="text-xs text-white/40">{m.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 text-xs text-gold/80 mb-6 flex gap-2">
                  <span>🔒</span>
                  <span>Paiement sécurisé via CinetPay. Vos données bancaires ne sont jamais stockées sur nos serveurs.</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1 justify-center">← Retour</button>
                  <button onClick={() => setStep(2)} className="btn-primary flex-1 justify-center">Continuer →</button>
                </div>
              </div>
            )}

            {/* STEP 2 — Confirmation */}
            {step === 2 && (
              <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6">
                <div className="font-syne font-bold text-base mb-5">✅ Confirmation</div>

                {/* Summary */}
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.produit_id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-bg-3 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">📦</div>}
                      </div>
                      <div className="flex-1 min-w-0 text-sm truncate">{item.nom} ×{item.quantite}</div>
                      <div className="text-xs text-white/60 font-bold">{(item.prix * item.quantite).toLocaleString()} F</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.06] pt-4 space-y-1.5 text-sm mb-4">
                  <div className="flex justify-between text-white/50">
                    <span>Mode livraison</span>
                    <span>{modeLivraison === 'point_relais' ? '📍 Point relais' : '🏠 Domicile'}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Paiement</span>
                    <span>{METHODES.find((m) => m.value === methode)?.label}</span>
                  </div>
                  {utilisPoints && <div className="flex justify-between text-success text-xs"><span>Réduction points</span><span>−{Math.round(reduction).toLocaleString()} F</span></div>}
                </div>

                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note pour la livraison (optionnel)" rows={2}
                  className="input-dark resize-none text-sm mb-4"/>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">← Retour</button>
                  <button onClick={handleCommander} disabled={loading}
                    className="btn-primary flex-1 justify-center py-3">
                    {loading ? '⏳ Traitement...' : `💳 Payer ${montantTotal.toLocaleString()} FCFA`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — order summary */}
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5 h-fit sticky top-20">
            <div className="font-syne font-bold text-sm mb-4">Récapitulatif</div>
            <div className="space-y-2.5 mb-4 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.produit_id} className="flex justify-between text-xs">
                  <span className="text-white/60 truncate mr-2">{item.nom} ×{item.quantite}</span>
                  <span className="font-bold flex-shrink-0">{(item.prix * item.quantite).toLocaleString()} F</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 text-sm border-t border-white/[0.06] pt-3">
              <div className="flex justify-between text-white/50 text-xs">
                <span>Sous-total</span><span>{sousTotal.toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-white/50 text-xs">
                <span>Livraison</span><span>{frais.toLocaleString()} F</span>
              </div>
              {reduction > 0 && (
                <div className="flex justify-between text-success text-xs">
                  <span>Réduction points</span><span>−{Math.round(reduction).toLocaleString()} F</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-white/[0.06]">
                <span>Total</span>
                <span className="text-primary">{Math.round(montantTotal).toLocaleString()} F</span>
              </div>
            </div>
            <Link to="/panier" className="block text-xs text-center text-white/30 hover:text-primary mt-4 transition-colors">
              ← Modifier le panier
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

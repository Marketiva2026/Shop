import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import api from '../../api/axios.config';
import { showToast } from '../../components/ui/Toast';

const NAV = [{ label: 'Vendeur', items: [
  { to: '/vendeur',           icon: '📊', label: 'Tableau de bord' },
  { to: '/vendeur/produits',  icon: '📦', label: 'Mes produits' },
  { to: '/vendeur/commandes', icon: '🛒', label: 'Commandes' },
  { to: '/vendeur/wallet',    icon: '💰', label: 'Wallet' },
  { to: '/vendeur/boutique',  icon: '🏪', label: 'Ma boutique' },
]}];

export default function VendorShopSettings() {
  const [boutique, setBoutique] = useState(null);
  const [form, setForm] = useState({ nom: '', description: '', telephone: '', adresse: '', ville: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/vendeur/boutique').then((r) => {
      const b = r.data.boutique;
      setBoutique(b);
      if (b) setForm({ nom: b.nom || '', description: b.description || '', telephone: b.telephone || '', adresse: b.adresse || '', ville: b.ville || '' });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/vendeur/boutique', form);
      showToast('✅ Boutique mise à jour', 'success');
      api.get('/vendeur/boutique').then((r) => setBoutique(r.data.boutique));
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Espace Vendeur"/>
      <div className="ml-[250px] flex-1 p-6">
        <div className="font-syne text-xl font-bold mb-6">Ma Boutique</div>

        {boutique && (
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="text-3xl">🏪</div>
            <div>
              <div className="font-medium">{boutique.nom}</div>
              <div className="text-xs text-white/40 mt-0.5">
                Statut :
                <span className={`ml-1.5 ${boutique.statut === 'active' ? 'text-success' : boutique.statut === 'en_attente' ? 'text-gold' : 'text-red-400'}`}>
                  {boutique.statut === 'active' ? '● Active' : boutique.statut === 'en_attente' ? '⏳ En attente de validation' : '❌ ' + boutique.statut}
                </span>
              </div>
            </div>
          </div>
        )}

        {boutique?.statut === 'en_attente' && (
          <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-3 text-gold text-sm mb-6 flex gap-2">
            <span>⏳</span>
            <span>Votre boutique est en cours de vérification. Les modifications sont possibles mais nécessitent une re-validation.</span>
          </div>
        )}

        {loading ? (
          <div className="bg-bg-2 rounded-2xl h-64 animate-pulse"/>
        ) : (
          <form onSubmit={handleSave} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div className="font-syne font-bold text-sm mb-2">Informations de la boutique</div>
            <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Nom de la boutique *" required className="input-dark"/>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description de votre boutique" rows={4} className="input-dark resize-none"/>
            <div className="grid grid-cols-2 gap-4">
              <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="Téléphone" className="input-dark"/>
              <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
                placeholder="Ville" className="input-dark"/>
            </div>
            <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              placeholder="Adresse complète" className="input-dark"/>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '...' : '💾 Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

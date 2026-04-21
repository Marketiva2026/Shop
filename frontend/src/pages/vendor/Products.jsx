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

const STATUT_CLS = { publie: 'badge-green', en_attente: 'badge-gold', rejete: 'badge-red', brouillon: 'badge-blue', archive: 'badge-red' };

export default function VendorProducts() {
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', categorie_id: '', prix: '', stock: '', description: '' });

  useEffect(() => {
    Promise.all([api.get('/vendeur/produits'), api.get('/produits/categories')]).then(([p, c]) => {
      setProduits(p.data.produits || []);
      setCategories(c.data.categories || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vendeur/produits', form);
      showToast('✅ Produit ajouté — en attente de validation', 'success');
      setShowForm(false);
      setForm({ nom: '', categorie_id: '', prix: '', stock: '', description: '' });
      api.get('/vendeur/produits').then((r) => setProduits(r.data.produits || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Archiver ce produit ?')) return;
    await api.delete(`/vendeur/produits/${id}`);
    setProduits((p) => p.filter((x) => x.id !== id));
    showToast('Produit archivé.', 'success');
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Espace Vendeur"/>
      <div className="ml-[250px] flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="font-syne text-xl font-bold">Mes produits</div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Ajouter</button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 mb-6 space-y-4">
            <div className="font-syne font-bold text-sm mb-2">Nouveau produit</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Nom du produit *" required className="input-dark"/>
              </div>
              <select value={form.categorie_id} onChange={(e) => setForm({ ...form, categorie_id: e.target.value })}
                required className="input-dark">
                <option value="">Catégorie *</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>)}
              </select>
              <input value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })}
                type="number" placeholder="Prix (FCFA) *" required className="input-dark"/>
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                type="number" placeholder="Stock" className="input-dark"/>
              <div className="col-span-2">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Description" rows={3} className="input-dark resize-none"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Créer le produit</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-16 animate-pulse"/>)}</div>
        ) : produits.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-3 opacity-20">📦</div>
            <div className="font-syne font-bold">Aucun produit</div>
          </div>
        ) : (
          <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
            {produits.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i < produits.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-bg-3 overflow-hidden flex-shrink-0">
                  {p.image_principale
                    ? <img src={p.image_principale} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-xl opacity-20">📦</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.nom}</div>
                  <div className="text-xs text-primary font-bold">{Number(p.prix).toLocaleString()} FCFA</div>
                </div>
                <div className="text-xs text-white/40">Stock: {p.stock}</div>
                <span className={STATUT_CLS[p.statut] || 'badge-blue'}>{p.statut}</span>
                <button onClick={() => handleDelete(p.id)} className="text-white/20 hover:text-red-400 transition-colors text-xs">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

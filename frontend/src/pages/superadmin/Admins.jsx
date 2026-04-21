import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { sa } from '../../api/admin.api';
import { showToast } from '../../components/ui/Toast';

const NAV = [
  { label: 'Vue Globale', items: [
    { to: '/superadmin',         icon: '📊', label: 'Tableau de bord' },
    { to: '/superadmin/logs',    icon: '🔍', label: "Logs d'activité" },
  ]},
  { label: 'Équipe Admin', items: [
    { to: '/superadmin/admins',  icon: '🛡️', label: 'Administrateurs' },
  ]},
  { label: 'Utilisateurs', items: [
    { to: '/superadmin/clients', icon: '👥', label: 'Clients & Vendeurs' },
  ]},
  { label: 'Plateforme', items: [
    { to: '/superadmin/config',  icon: '⚙️', label: 'Configuration' },
  ]},
];

const ROLES = [
  { value: 'admin_support',    label: 'Support Client',     icon: '🎧' },
  { value: 'admin_finances',   label: 'Finances',           icon: '💰' },
  { value: 'admin_vendeurs',   label: 'Gestion Vendeurs',   icon: '🏪' },
  { value: 'admin_contenu',    label: 'Contenu & Produits', icon: '📦' },
  { value: 'admin_logistique', label: 'Logistique',         icon: '🚚' },
  { value: 'admin_marketing',  label: 'Marketing',          icon: '📣' },
  { value: 'agent_relais',     label: 'Agent Relais',       icon: '📍' },
];

const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.value, r]));

const EMPTY_FORM = { nom_complet: '', email: '', telephone: '', role: '', mot_de_passe: '' };

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => sa.getAdmins().then((r) => setAdmins(r.data.admins || [])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ nom_complet: a.nom_complet, email: a.email, telephone: a.telephone || '', role: a.role, mot_de_passe: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await sa.updateAdmin(editing.id, form);
        showToast('✅ Administrateur mis à jour', 'success');
      } else {
        await sa.creerAdmin(form);
        showToast('✅ Administrateur créé', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur.', 'error');
    } finally { setSaving(false); }
  };

  const handleToggle = async (a) => {
    try {
      await sa.toggleAdmin(a.id);
      setAdmins((prev) => prev.map((x) => x.id === a.id ? { ...x, est_actif: !x.est_actif } : x));
      showToast(a.est_actif ? 'Admin désactivé' : 'Admin activé', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Supprimer ${a.nom_complet} ?`)) return;
    try {
      await sa.supprimerAdmin(a.id);
      setAdmins((prev) => prev.filter((x) => x.id !== a.id));
      showToast('Admin supprimé.', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Super Administration" crown={true}/>
      <div className="ml-[250px] flex-1">
        {/* Topbar */}
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div>
            <div className="font-syne font-bold">Administrateurs</div>
            <div className="text-[10px] text-white/30">{admins.length} admin(s) configuré(s)</div>
          </div>
          <button onClick={openCreate} className="btn-primary text-xs px-4 py-2">+ Créer un admin</button>
        </div>

        <div className="p-6">
          {/* Role legend */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ROLES.map((r) => (
              <div key={r.value} className="bg-bg-2 border border-white/[0.06] rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/50">
                <span>{r.icon}</span><span>{r.label}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-6 mb-6">
              <div className="font-syne font-bold text-sm mb-4">
                {editing ? `Modifier ${editing.nom_complet}` : 'Nouvel Administrateur'}
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <input value={form.nom_complet} onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
                  placeholder="Nom complet *" required className="input-dark"/>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email" placeholder="Email *" required className="input-dark"/>
                <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="Téléphone" className="input-dark"/>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  required className="input-dark">
                  <option value="">Rôle *</option>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                </select>
                <input value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
                  type="password" placeholder={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                  required={!editing} className="input-dark col-span-2"/>
                <div className="col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? '...' : editing ? 'Enregistrer' : 'Créer'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-16 animate-pulse"/>)}</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <div className="text-5xl mb-3 opacity-20">🛡️</div>
              <div className="font-syne font-bold">Aucun administrateur</div>
              <div className="text-sm mt-1">Créez votre premier administrateur ci-dessus</div>
            </div>
          ) : (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Admin','Rôle','Contact','Statut','Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => {
                    const role = ROLE_MAP[a.role];
                    return (
                      <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-bg-3 rounded-xl flex items-center justify-center text-base">
                              {role?.icon || '👤'}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{a.nom_complet}</div>
                              <div className="text-xs text-white/30 font-mono">#SA-{String(a.id).padStart(4, '0')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="badge-blue text-[10px]">{role?.label || a.role}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-white/60">{a.email}</div>
                          {a.telephone && <div className="text-xs text-white/30 mt-0.5">{a.telephone}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={a.est_actif ? 'badge-green' : 'badge-red'}>
                            {a.est_actif ? '● Actif' : '● Inactif'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(a)} className="text-xs text-white/40 hover:text-primary transition-colors">✏️</button>
                            <button onClick={() => handleToggle(a)} className={`text-xs transition-colors ${a.est_actif ? 'text-white/40 hover:text-gold' : 'text-white/40 hover:text-success'}`}>
                              {a.est_actif ? '🔒' : '🔓'}
                            </button>
                            <button onClick={() => handleDelete(a)} className="text-xs text-white/20 hover:text-red-400 transition-colors">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

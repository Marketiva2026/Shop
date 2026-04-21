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

const CONFIG_META = {
  commission_plateforme:    { label: 'Commission plateforme (%)', icon: '💰', type: 'number', group: 'Finances' },
  frais_livraison_defaut:   { label: 'Frais livraison défaut (FCFA)', icon: '🚚', type: 'number', group: 'Finances' },
  montant_min_retrait:      { label: 'Montant minimum retrait (FCFA)', icon: '💳', type: 'number', group: 'Finances' },
  parrainage_niveau1:       { label: 'Bonus parrainage N1 (FCFA)', icon: '🎯', type: 'number', group: 'Parrainage' },
  parrainage_niveau2:       { label: 'Bonus parrainage N2 (FCFA)', icon: '🎯', type: 'number', group: 'Parrainage' },
  parrainage_niveau3:       { label: 'Bonus parrainage N3 (FCFA)', icon: '🎯', type: 'number', group: 'Parrainage' },
  otp_expiry_minutes:       { label: 'Expiration OTP (minutes)', icon: '🔒', type: 'number', group: 'Sécurité' },
  max_tentatives_otp:       { label: 'Tentatives OTP max', icon: '🔒', type: 'number', group: 'Sécurité' },
  maintenance_mode:         { label: 'Mode maintenance', icon: '🔧', type: 'boolean', group: 'Système' },
  inscription_ouverte:      { label: 'Inscription ouverte', icon: '🚪', type: 'boolean', group: 'Système' },
  max_produits_par_vendeur: { label: 'Produits max par vendeur', icon: '📦', type: 'number', group: 'Limites' },
  max_images_par_produit:   { label: 'Images max par produit', icon: '🖼️', type: 'number', group: 'Limites' },
  devise:                   { label: 'Devise', icon: '💱', type: 'text', group: 'Localisation' },
  pays:                     { label: 'Pays', icon: '🌍', type: 'text', group: 'Localisation' },
};

export default function SuperAdminConfig() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    sa.getConfig().then((r) => {
      const cfg = {};
      (r.data.config || []).forEach((item) => { cfg[item.cle] = item.valeur; });
      setConfig(cfg);
    }).finally(() => setLoading(false));
  }, []);

  const update = (key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await sa.updateConfig(config);
      showToast('✅ Configuration sauvegardée', 'success');
      setDirty(false);
    } catch { showToast('Erreur lors de la sauvegarde.', 'error'); }
    finally { setSaving(false); }
  };

  const groups = [...new Set(Object.values(CONFIG_META).map((m) => m.group))];

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Super Administration" crown={true}/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div>
            <div className="font-syne font-bold">Configuration Système</div>
            <div className="text-[10px] text-white/30">Paramètres globaux de la plateforme</div>
          </div>
          {dirty && (
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-4 py-2">
              {saving ? '...' : '💾 Sauvegarder'}
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-28 animate-pulse"/>)}</div>
          ) : groups.map((group) => {
            const keys = Object.entries(CONFIG_META).filter(([, m]) => m.group === group);
            return (
              <div key={group} className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06]">
                  <div className="font-syne font-bold text-sm">{group}</div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  {keys.map(([key, meta]) => (
                    <div key={key}>
                      <label className="block text-xs text-white/40 mb-1.5">
                        {meta.icon} {meta.label}
                      </label>
                      {meta.type === 'boolean' ? (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input type="checkbox"
                              checked={config[key] === 'true' || config[key] === true}
                              onChange={(e) => update(key, String(e.target.checked))}
                              className="sr-only peer"/>
                            <div className="w-11 h-6 bg-bg-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary/60"/>
                          </div>
                          <span className="text-xs text-white/60">
                            {config[key] === 'true' || config[key] === true ? 'Activé' : 'Désactivé'}
                          </span>
                        </label>
                      ) : (
                        <input value={config[key] || ''} onChange={(e) => update(key, e.target.value)}
                          type={meta.type} className="input-dark"/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

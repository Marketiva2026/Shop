import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { admin } from '../../api/admin.api';
import { showToast } from '../../components/ui/Toast';

const NAV = [{ label: 'Finances', items: [
  { to: '/admin',          icon: '📊', label: 'Tableau de bord' },
  { to: '/admin/retraits', icon: '💸', label: 'Retraits' },
  { to: '/admin/finances', icon: '📈', label: 'Analytiques' },
]}];

export default function AdminFinances() {
  const [retraits, setRetraits] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([admin.getRetraits(), admin.getFinancesDashboard()])
      .then(([r, d]) => { setRetraits(r.data.retraits || []); setDashboard(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleValider = async (id) => {
    try {
      await admin.validerRetrait(id);
      setRetraits((prev) => prev.map((r) => r.id === id ? { ...r, statut: 'valide' } : r));
      showToast('✅ Retrait validé', 'success');
    } catch { showToast('Erreur.', 'error'); }
  };

  const pending = retraits.filter((r) => r.statut === 'en_attente');
  const done = retraits.filter((r) => r.statut !== 'en_attente');

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar navItems={NAV} title="Finances"/>
      <div className="ml-[250px] flex-1">
        <div className="sticky top-0 z-40 h-[62px] bg-bg-base/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6">
          <div className="font-syne font-bold">Gestion Financière</div>
        </div>

        <div className="p-6">
          {dashboard && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Volume total', val: Number(dashboard.volume_total || 0).toLocaleString() + ' F', icon: '💰', color: 'text-success' },
                { label: 'Commission', val: Number(dashboard.commission_totale || 0).toLocaleString() + ' F', icon: '📊', color: 'text-primary' },
                { label: 'Retraits en attente', val: pending.length, icon: '⏳', color: 'text-gold' },
                { label: 'Transactions', val: dashboard.nb_transactions || 0, icon: '💳', color: 'text-blue-400' },
              ].map((kpi, i) => (
                <div key={i} className="bg-bg-2 border border-white/[0.06] rounded-2xl p-5">
                  <div className="text-2xl mb-2">{kpi.icon}</div>
                  <div className={`font-syne text-xl font-bold ${kpi.color}`}>{kpi.val}</div>
                  <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-white/[0.06] font-syne font-bold text-sm flex items-center gap-2">
                <span>⏳ Retraits en attente</span>
                <span className="badge-gold">{pending.length}</span>
              </div>
              {pending.map((r, i) => (
                <div key={r.id} className={`flex items-center gap-4 px-5 py-4 ${i < pending.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{r.vendeur_nom}</div>
                    <div className="text-xs text-white/40">{r.methode} · {r.numero}</div>
                  </div>
                  <div className="font-syne font-bold text-success">{Number(r.montant).toLocaleString()} FCFA</div>
                  <div className="text-xs text-white/30">{new Date(r.cree_le).toLocaleDateString('fr-FR')}</div>
                  <button onClick={() => handleValider(r.id)} className="text-xs text-success hover:underline">✅ Valider</button>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="bg-bg-2 rounded-2xl h-14 animate-pulse"/>)}</div>
          ) : done.length > 0 && (
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] font-syne font-bold text-sm">Historique retraits</div>
              {done.map((r, i) => (
                <div key={r.id} className={`flex items-center gap-4 px-5 py-4 ${i < done.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.vendeur_nom}</div>
                    <div className="text-xs text-white/40">{r.methode}</div>
                  </div>
                  <div className="font-bold text-sm">{Number(r.montant).toLocaleString()} F</div>
                  <span className={r.statut === 'valide' ? 'badge-green' : 'badge-red'}>{r.statut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

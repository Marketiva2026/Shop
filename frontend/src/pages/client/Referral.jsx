import { useState, useEffect } from 'react';
import PublicNav from '../../components/layout/PublicNav';
import api from '../../api/axios.config';
import { showToast } from '../../components/ui/Toast';

export default function Referral() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/user/parrainage').then((r) => setData(r.data)); }, []);

  const copy = () => {
    navigator.clipboard.writeText(data?.code_parrainage || '');
    showToast('✅ Code copié !', 'success');
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <PublicNav/>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-syne text-2xl font-bold mb-6">Parrainage</h1>

        <div className="bg-gradient-to-br from-success/10 to-bg-2 border border-success/20 rounded-2xl p-6 mb-6">
          <div className="text-white/50 text-sm mb-3">Votre code de parrainage</div>
          <div className="flex items-center gap-3">
            <div className="font-syne text-3xl font-extrabold text-success tracking-widest flex-1">
              {data?.code_parrainage || '—'}
            </div>
            <button onClick={copy} className="btn-secondary text-xs px-4 py-2">Copier</button>
          </div>
          <div className="text-xs text-white/40 mt-3">
            Partagez ce code — gagnez des points à chaque achat de vos filleuls (3 niveaux)
          </div>
        </div>

        <div className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="font-syne font-bold text-sm">
              Mes filleuls ({data?.filleuls?.length || 0})
            </div>
          </div>
          {!data?.filleuls?.length ? (
            <div className="text-center py-12 text-white/30 text-sm">Aucun filleul pour l'instant</div>
          ) : (
            data.filleuls.map((f, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0">
                <div className="w-8 h-8 bg-bg-3 rounded-xl flex items-center justify-center font-bold text-sm">
                  {f.nom_complet[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{f.nom_complet}</div>
                  <div className="text-xs text-white/30">Niveau {f.niveau} · Inscrit le {new Date(f.date_inscription).toLocaleDateString('fr-FR')}</div>
                </div>
                <div className="text-success text-sm font-bold">+{f.points_generes} pts</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

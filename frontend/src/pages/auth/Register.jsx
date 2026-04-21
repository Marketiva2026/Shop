import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { inscription } from '../../api/auth.api';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await inscription(data);
      navigate('/verifier-otp', { state: { telephone: res.data.telephone, type: 'inscription', otp_demo: res.data.otp_demo } });
    } catch (err) {
      const d = err.response?.data;
      if (d?.action === 'login') {
        setError(d.message + ' → ');
      } else {
        setError(d?.message || 'Erreur d\'inscription.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <Link to="/" className="font-syne text-3xl font-extrabold">
            <span className="text-primary">Market</span><span className="text-success">i</span>va
          </Link>
          <div className="text-white/40 text-sm mt-2">Créez votre compte gratuitement</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Nom complet *</label>
            <input {...register('nom_complet', { required: 'Nom requis.', minLength: { value: 2, message: 'Min. 2 caractères.' } })}
              placeholder="Ex: Koné Aminata" className="input-dark"/>
            {errors.nom_complet && <p className="text-red-400 text-xs mt-1">{errors.nom_complet.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Numéro de téléphone *</label>
            <input {...register('telephone', { required: 'Téléphone requis.' })}
              type="tel" placeholder="+225 07 XX XX XX XX" className="input-dark"/>
            {errors.telephone && <p className="text-red-400 text-xs mt-1">{errors.telephone.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Email <span className="text-white/30 font-normal">(optionnel)</span></label>
            <input {...register('email')} type="email" placeholder="votre@email.com" className="input-dark"/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Mot de passe *</label>
            <input {...register('mot_de_passe', { required: 'MDP requis.', minLength: { value: 8, message: 'Min. 8 caractères.' } })}
              type="password" placeholder="Minimum 8 caractères" className="input-dark"/>
            {errors.mot_de_passe && <p className="text-red-400 text-xs mt-1">{errors.mot_de_passe.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Code parrainage <span className="text-white/30 font-normal">(optionnel)</span></label>
            <input {...register('code_parrainage')} placeholder="Ex: KONE1234" className="input-dark uppercase"
              onChange={(e) => e.target.value = e.target.value.toUpperCase()}/>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
              {error.includes('→') && <Link to="/connexion" className="ml-1 underline">Se connecter</Link>}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
            {loading ? '...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/40">
          Déjà inscrit ? <Link to="/connexion" className="text-primary hover:underline font-medium">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}

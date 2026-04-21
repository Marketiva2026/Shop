import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (produit, quantite = 1) => {
        const items = get().items;
        const idx = items.findIndex((i) => i.produit_id === produit.id);
        if (idx >= 0) {
          const updated = [...items];
          updated[idx] = { ...updated[idx], quantite: updated[idx].quantite + quantite };
          set({ items: updated });
        } else {
          set({ items: [...items, { produit_id: produit.id, nom: produit.nom, prix: produit.prix_promo || produit.prix, image: produit.image_principale, quantite }] });
        }
      },

      removeItem: (produitId) => set({ items: get().items.filter((i) => i.produit_id !== produitId) }),

      updateQuantite: (produitId, quantite) => {
        if (quantite <= 0) { get().removeItem(produitId); return; }
        set({ items: get().items.map((i) => i.produit_id === produitId ? { ...i, quantite } : i) });
      },

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.prix * i.quantite, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantite, 0),
    }),
    {
      name: 'mkv-cart',
      storage: {
        getItem: (k) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; },
        setItem: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
        removeItem: (k) => localStorage.removeItem(k),
      },
    }
  )
);

export default useCartStore;

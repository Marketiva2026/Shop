import { useState, useCallback, useEffect } from 'react';

let toastFn = null;

export const showToast = (msg, type = 'default') => {
  if (toastFn) toastFn(msg, type);
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = (msg, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    return () => { toastFn = null; };
  }, []);

  const colors = {
    success: 'border-success/30 text-success',
    error: 'border-red-500/30 text-red-400',
    default: 'border-white/20 text-white',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`bg-bg-3 border rounded-full px-5 py-3 text-sm font-medium flex items-center gap-2
                     shadow-2xl animate-slide-up ${colors[t.type] || colors.default}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

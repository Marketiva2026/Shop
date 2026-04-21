import { useRef, useState } from 'react';

export default function OTPInput({ length = 6, onChange }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const refs = useRef([]);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...values];
    updated[i] = val.slice(-1);
    setValues(updated);
    onChange(updated.join(''));
    if (val && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !values[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    const updated = Array(length).fill('');
    text.split('').forEach((c, i) => { updated[i] = c; });
    setValues(updated);
    onChange(updated.join(''));
    refs.current[Math.min(text.length, length - 1)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          maxLength={1}
          inputMode="numeric"
          className="w-12 h-14 text-center text-xl font-bold bg-bg-3 border border-white/10 rounded-xl
                     text-white focus:outline-none focus:border-primary transition-colors"
        />
      ))}
    </div>
  );
}

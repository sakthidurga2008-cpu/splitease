import { useEffect, useState } from 'react';

/**
 * A button for actions that remove something. The first click asks, the second confirms.
 * It goes back to normal by itself after a few seconds.
 */
export default function ConfirmButton({ label, confirmLabel, onConfirm, icon }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!asking) return undefined;
    const timer = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(timer);
  }, [asking]);

  const click = async (event) => {
    event.stopPropagation();
    if (!asking) return setAsking(true);
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <button
      type="button"
      className={asking ? 'text-button text-button-danger is-asking' : 'text-button text-button-muted'}
      onClick={click}
      disabled={busy}
    >
      {icon}
      {asking ? confirmLabel : label}
    </button>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const show = useCallback((message, tone = 'success') => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }].slice(-3));
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  // The list is a popover so that it appears above an open dialog.
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof list.showPopover !== 'function') return;
    const open = list.matches(':popover-open');
    if (toasts.length > 0 && !open) list.showPopover();
    if (toasts.length === 0 && open) list.hidePopover();
  }, [toasts]);

  const value = useMemo(
    () => ({ success: (message) => show(message, 'success'), error: (message) => show(message, 'error') }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div ref={listRef} popover="manual" className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            {toast.tone === 'error' ? <CircleAlert size={16} aria-hidden /> : <Check size={16} aria-hidden />}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

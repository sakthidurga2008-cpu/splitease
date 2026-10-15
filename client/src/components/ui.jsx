// Small building blocks shared across the site.

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import { initials, money, statusLabel } from '../lib/format.js';

/** A rupee amount. Hidden behind dots when "Hide amounts" is on. */
export function Amount({ value, className = '' }) {
  const { settings } = useSettings();
  if (settings.hideAmounts) {
    return (
      <span className={`amount ${className}`} aria-label="Amount hidden">
        ₹ ••••
      </span>
    );
  }
  return <span className={`amount ${className}`}>{money(value)}</span>;
}

/** Initials in a tinted circle. Each person keeps the same colour everywhere. */
export function Avatar({ id, name, size = 'm' }) {
  const colour = ((Number(id) || 0) % 6) + 1;
  return (
    <span className={`avatar avatar-${size} member-${colour}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

const STATUS_TONE = { PAID: 'good', 'PARTIALLY PAID': 'warn', PENDING: 'warn' };

export function StatusBadge({ status }) {
  return <span className={`badge badge-${STATUS_TONE[status] || 'plain'}`}>{statusLabel(status)}</span>;
}

/** A labelled form field with room for a hint and an error. */
export function Field({ label, hint, error, children, className = '' }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A row of mutually exclusive choices, shown as joined buttons. */
export function Segmented({ label, options, value, onChange, size = 'm' }) {
  const name = useId();
  return (
    <div className={`segmented segmented-${size}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className={value === option.value ? 'is-on' : ''}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.icon}
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/** A dialog that sits above the page. Closes on Escape or a click outside. */
export function Modal({ title, description, onClose, children, footer, width = 'm' }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${width}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-panel">
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      {icon ? <span className="empty-icon">{icon}</span> : null}
      <p className="empty-title">{title}</p>
      {children ? <p className="empty-text">{children}</p> : null}
      {action}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <div className="empty">
      <p className="empty-title">This could not be loaded</p>
      <p className="empty-text">{error?.message}</p>
      {onRetry ? (
        <button type="button" className="button button-quiet" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** An inline message at the top of a form. */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}

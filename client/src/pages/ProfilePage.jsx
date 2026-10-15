import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Amount, Avatar, Field, FormError } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function ProfilePage() {
  usePageTitle('Profile');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { data } = useFetch('/users/me');

  const [form, setForm] = useState({ user_name: user.user_name, phone_number: user.phone_number, email: user.email });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const changed =
    form.user_name !== user.user_name || form.phone_number !== user.phone_number || form.email !== user.email;
  const phoneChanged = form.phone_number.replace(/[\s-]/g, '') !== user.phone_number;
  const change = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const fieldError = (name) => (error?.field === name ? error.message : null);
  useEffect(() => setError(null), [form]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user: updated } = await api.patch('/users/me', form);
      setUser(updated);
      setForm({ user_name: updated.user_name, phone_number: updated.phone_number, email: updated.email });
      toast.success('Profile saved');
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(user.user_id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The ID is on screen to read if the clipboard is blocked.
    }
  };

  const stats = data?.stats;

  return (
    <div className="narrow">
      <header className="page-head">
        <div>
          <h1>Profile</h1>
          <p className="page-sub">Your details, and what you use to log in.</p>
        </div>
      </header>

      <section className="panel profile-card">
        <Avatar id={user.user_id} name={user.user_name} size="l" />
        <div className="profile-who">
          <p className="profile-name">{user.user_name}</p>
          <p className="page-sub">{user.email}</p>
        </div>
        <div className="profile-id">
          <span>User ID</span>
          <strong>{user.user_id}</strong>
          <button type="button" className="text-button" onClick={copyId}>
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      {stats ? (
        <dl className="facts">
          <div>
            <dt>Groups</dt>
            <dd>{stats.group_count}</dd>
          </div>
          <div>
            <dt>Expenses you paid</dt>
            <dd>{stats.expenses_paid}</dd>
          </div>
          <div>
            <dt>Total you paid</dt>
            <dd>
              <Amount value={stats.total_paid} />
            </dd>
          </div>
          <div>
            <dt>Payments</dt>
            <dd>{stats.settlement_count}</dd>
          </div>
        </dl>
      ) : null}

      <section className="panel panel-padded">
        <h2>Your details</h2>
        <form onSubmit={submit} noValidate>
          <FormError>{error && !error.field ? error.message : null}</FormError>

          <Field label="Full name" error={fieldError('user_name')}>
            {(props) => (
              <input {...props} type="text" autoComplete="name" maxLength={100} value={form.user_name} onChange={change('user_name')} />
            )}
          </Field>

          <Field
            label="Phone number"
            error={fieldError('phone_number')}
            hint={
              phoneChanged
                ? 'Saving this changes your password to the new number.'
                : 'Your phone number is also your password.'
            }
          >
            {(props) => (
              <input {...props} type="tel" autoComplete="tel" maxLength={15} value={form.phone_number} onChange={change('phone_number')} />
            )}
          </Field>

          <Field label="Email" error={fieldError('email')}>
            {(props) => (
              <input {...props} type="email" autoComplete="email" maxLength={100} value={form.email} onChange={change('email')} />
            )}
          </Field>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={!changed || busy}>
              {busy ? 'Saving' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

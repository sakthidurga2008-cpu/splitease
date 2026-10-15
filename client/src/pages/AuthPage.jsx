import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import SplitBar from '../components/SplitBar.jsx';
import { Avatar, Field, FormError, Segmented } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { money } from '../lib/format.js';

const FRIENDS = ['Linus', 'Sakthi', 'Jyotsna', 'Arjun', 'Kavin'];
const BILL = 2400;

/** A small working example of what the site does: change the headcount and the bill re-divides. */
function SplitDemo() {
  const [people, setPeople] = useState(3);
  const share = BILL / people;

  return (
    <div className="demo">
      <div className="demo-bill">
        <span>Dinner at the beach shack</span>
        <strong>{money(BILL)}</strong>
      </div>
      <SplitBar
        size="l"
        label={`${money(BILL)} split between ${people} people`}
        segments={FRIENDS.slice(0, people).map((name, index) => ({
          key: name,
          value: 1,
          tone: `member-${index + 1}`,
        }))}
      />
      <ul className="demo-people">
        {FRIENDS.slice(0, people).map((name, index) => (
          <li key={name}>
            <Avatar id={index} name={name} size="s" />
            <span>{name}</span>
            <strong>{money(share)}</strong>
          </li>
        ))}
      </ul>
      <div className="demo-control">
        <span id="demo-label">Split between</span>
        <Segmented
          label="Number of people"
          size="s"
          value={people}
          onChange={setPeople}
          options={[2, 3, 4, 5].map((count) => ({ value: count, label: String(count) }))}
        />
        <span>people</span>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setError(null), [userId, password]);

  const submit = async (event) => {
    event.preventDefault();
    if (!userId.trim()) return setError({ field: 'user_id', message: 'Enter your user ID.' });
    if (!password) return setError({ field: 'password', message: 'Enter your password.' });
    setBusy(true);
    setError(null);
    try {
      await login(Number(userId), password);
    } catch (problem) {
      setError(problem);
      setBusy(false);
    }
  };

  const fieldError = (name) => (error?.field === name ? error.message : null);

  return (
    <form onSubmit={submit} noValidate>
      <FormError>{error && !error.field ? error.message : null}</FormError>

      <Field label="User ID" error={fieldError('user_id')} hint="The number you were given when you created your account.">
        {(props) => (
          <input
            {...props}
            type="text"
            inputMode="numeric"
            autoComplete="username"
            autoFocus
            value={userId}
            onChange={(event) => setUserId(event.target.value.replace(/\D/g, ''))}
          />
        )}
      </Field>

      <Field label="Password" error={fieldError('password')} hint="Your password is the phone number you registered with.">
        {(props) => (
          <div className="input-with-button">
            <input
              {...props}
              type={showPassword ? 'text' : 'password'}
              inputMode="tel"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
            </button>
          </div>
        )}
      </Field>

      <button type="submit" className="button button-primary button-wide" disabled={busy}>
        {busy ? 'Logging in' : 'Log in'}
      </button>
    </form>
  );
}

function RegisterForm({ onCreated, holdRedirect }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ user_name: '', phone_number: '', email: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const change = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const fieldError = (name) => (error?.field === name ? error.message : null);
  useEffect(() => setError(null), [form]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.user_name.trim()) return setError({ field: 'user_name', message: 'Enter your name.' });
    if (!form.phone_number.trim()) return setError({ field: 'phone_number', message: 'Enter your phone number.' });
    if (!form.email.trim()) return setError({ field: 'email', message: 'Enter your email address.' });
    setBusy(true);
    setError(null);
    // Stay on this page after signing up so the new user ID can be shown.
    holdRedirect.current = true;
    try {
      onCreated(await register(form));
    } catch (problem) {
      holdRedirect.current = false;
      setError(problem);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormError>{error && !error.field ? error.message : null}</FormError>

      <Field label="Full name" error={fieldError('user_name')}>
        {(props) => (
          <input {...props} type="text" autoComplete="name" autoFocus maxLength={100} value={form.user_name} onChange={change('user_name')} />
        )}
      </Field>

      <Field label="Phone number" error={fieldError('phone_number')} hint="This becomes your password.">
        {(props) => (
          <input {...props} type="tel" autoComplete="tel" maxLength={15} value={form.phone_number} onChange={change('phone_number')} />
        )}
      </Field>

      <Field label="Email" error={fieldError('email')}>
        {(props) => (
          <input {...props} type="email" autoComplete="email" maxLength={100} value={form.email} onChange={change('email')} />
        )}
      </Field>

      <button type="submit" className="button button-primary button-wide" disabled={busy}>
        {busy ? 'Creating account' : 'Create account'}
      </button>
    </form>
  );
}

/** Shown once, straight after sign-up, because the user ID is needed to log in again. */
function AccountReady({ user, onContinue }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(user.user_id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the number is on screen to note down.
    }
  };

  return (
    <div className="ready">
      <h1>Your account is ready</h1>
      <p className="auth-lead">Note down your user ID. You need it every time you log in.</p>

      <div className="ready-id">
        <div>
          <span>Your user ID</span>
          <strong>{user.user_id}</strong>
        </div>
        <button type="button" className="button button-quiet" onClick={copy}>
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="ready-note">
        Your password is your phone number, <strong>{user.phone_number}</strong>.
      </p>

      <button type="button" className="button button-primary button-wide" onClick={onContinue} autoFocus>
        Go to my overview
      </button>
    </div>
  );
}

export default function AuthPage() {
  const { user, checking } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [createdUser, setCreatedUser] = useState(null);
  const holdRedirect = useRef(false);

  useEffect(() => {
    document.title = mode === 'login' ? 'Log in to SplitEase' : 'Create a SplitEase account';
  }, [mode]);

  const destination = location.state?.from && location.state.from !== '/login' ? location.state.from : '/';
  if (!checking && user && !createdUser && !holdRedirect.current) return <Navigate to={destination} replace />;

  return (
    <div className="auth">
      <section className="auth-intro">
        <Logo size="l" />
        <div className="auth-pitch">
          <p className="auth-headline">Shared costs, split fairly.</p>
          <p className="auth-sub">
            Keep one running tab for trips, flats and projects. See who owes whom, then settle up.
          </p>
        </div>
        <SplitDemo />
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div className="auth-card-logo">
            <Logo />
          </div>
          {createdUser ? (
            <AccountReady user={createdUser} onContinue={() => navigate('/', { replace: true })} />
          ) : (
            <>
              <h1>{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
              <p className="auth-lead">
                {mode === 'login'
                  ? 'Use your user ID and phone number.'
                  : 'It takes three details. You get a user ID to log in with.'}
              </p>

              <Segmented
                label="Log in or create an account"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'login', label: 'Log in' },
                  { value: 'register', label: 'Create account' },
                ]}
              />

              {mode === 'login' ? <LoginForm /> : <RegisterForm onCreated={setCreatedUser} holdRedirect={holdRedirect} />}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { Segmented } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function SettingsPage() {
  usePageTitle('Settings');
  const { user, logout } = useAuth();
  const { settings, update } = useSettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="narrow">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">These choices are saved on this device.</p>
        </div>
      </header>

      <section className="panel settings">
        <div className="setting">
          <div>
            <h2>Appearance</h2>
            <p>Choose light or dark, or follow your device.</p>
          </div>
          <Segmented
            label="Appearance"
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'light', label: 'Light', icon: <Sun size={15} aria-hidden /> },
              { value: 'dark', label: 'Dark', icon: <Moon size={15} aria-hidden /> },
              { value: 'system', label: 'Match device', icon: <Monitor size={15} aria-hidden /> },
            ]}
          />
        </div>

        <div className="setting">
          <div>
            <h2 id="hide-label">Hide amounts</h2>
            <p>Show dots in place of rupee amounts, for when someone can see your screen.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideAmounts}
            aria-labelledby="hide-label"
            className={settings.hideAmounts ? 'switch is-on' : 'switch'}
            onClick={() => update({ hideAmounts: !settings.hideAmounts })}
          >
            <span />
          </button>
        </div>

        <div className="setting">
          <div>
            <h2>Logging in</h2>
            <p>
              You log in with user ID <strong>{user.user_id}</strong> and your phone number as the password. Change the
              number on your profile.
            </p>
          </div>
          <button type="button" className="button button-quiet" onClick={() => navigate('/profile')}>
            Open profile
          </button>
        </div>

        <div className="setting">
          <div>
            <h2>Log out</h2>
            <p>End your session on this device.</p>
          </div>
          <button type="button" className="button button-quiet" onClick={handleLogout}>
            <LogOut size={16} aria-hidden />
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}

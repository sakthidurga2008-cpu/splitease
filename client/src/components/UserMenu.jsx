import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { firstName } from '../lib/format.js';
import { Avatar, Segmented } from './ui.jsx';

/** The menu in the top right corner: profile, settings, light or dark, log out. */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { resolvedTheme, update } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="usermenu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="usermenu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar id={user.user_id} name={user.user_name} size="s" />
        <span className="usermenu-name">{firstName(user.user_name)}</span>
        <ChevronDown size={15} aria-hidden className={open ? 'is-flipped' : ''} />
      </button>

      {open ? (
        <div className="menu" role="menu" aria-label="Account">
          <div className="menu-head">
            <Avatar id={user.user_id} name={user.user_name} />
            <div>
              <p className="menu-name">{user.user_name}</p>
              <p className="menu-sub">User ID {user.user_id}</p>
            </div>
          </div>

          <Link to="/profile" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <UserRound size={16} aria-hidden />
            Profile
          </Link>
          <Link to="/settings" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <Settings size={16} aria-hidden />
            Settings
          </Link>

          <div className="menu-row">
            <span>Appearance</span>
            <Segmented
              label="Appearance"
              size="s"
              value={resolvedTheme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: 'light', label: 'Light', icon: <Sun size={14} aria-hidden /> },
                { value: 'dark', label: 'Dark', icon: <Moon size={14} aria-hidden /> },
              ]}
            />
          </div>

          <button type="button" role="menuitem" className="menu-item menu-item-end" onClick={handleLogout}>
            <LogOut size={16} aria-hidden />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { Link, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Moon, ReceiptText, Sun, UsersRound } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import Logo from './Logo.jsx';
import UserMenu from './UserMenu.jsx';

const LINKS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/groups', label: 'Groups', icon: UsersRound },
  { to: '/activity', label: 'Activity', icon: ReceiptText },
];

/** The frame around every signed-in page: top bar, navigation and the page itself. */
export default function AppShell() {
  const { resolvedTheme, toggleTheme } = useSettings();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="topbar-logo" aria-label="SplitEase, go to overview">
            <Logo />
          </Link>

          <nav className="topnav" aria-label="Main">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${nextTheme} mode`}
              title={`Switch to ${nextTheme} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main id="main" className="page">
        <Outlet />
      </main>

      {/* On phones the main navigation moves to the bottom of the screen. */}
      <nav className="bottomnav" aria-label="Main">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            <link.icon size={20} aria-hidden />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

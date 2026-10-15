import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { LoadingBlock } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import GroupPage from './pages/GroupPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

// Pages inside this wrapper are only shown to a logged-in user.
function SignedIn() {
  const { user, checking, loggedOut } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="splash">
        <LoadingBlock label="Opening SplitEase" />
      </div>
    );
  }
  if (!user) {
    // If the session simply expired, remember the page so login can return to it.
    const state = loggedOut.current ? null : { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<SignedIn />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:groupId" element={<GroupPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

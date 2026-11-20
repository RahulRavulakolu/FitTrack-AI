import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  House,
  Utensils,
  Dumbbell,
  UserRound,
  Sparkles,
  Bell,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { AppProvider, useApp } from './lib/app';
import { Avatar, Brand, Button, Loading, Modal } from './components/ui';
import { Assistant } from './components/Assistant';
import { ConnectionButton } from './components/MobileGate';
import { AuthPage } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Nutrition } from './pages/Nutrition';
import { Workouts } from './pages/Workouts';
import { Profile } from './pages/Profile';
function Guard({ onboarding = false }: { onboarding?: boolean }) {
  const { user, loading, failure, state, refresh } = useApp();
  if (loading) return <Loading />;
  if (failure)
    return (
      <div className="loading">
        <Brand />
        <p role="alert">{failure}</p>
        <Button onClick={() => location.reload()}>Try again</Button>
        <ConnectionButton />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (onboarding) return user.onboardingCompleted ? <Navigate to="/" replace /> : <Onboarding />;
  if (!user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (!state) return <Loading />;
  return <Shell />;
}
function AuthGuard({ mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' }) {
  const { user, loading } = useApp();
  if (loading) return <Loading />;
  if (user && mode !== 'reset')
    return <Navigate to={user.onboardingCompleted ? '/' : '/onboarding'} replace />;
  return <AuthPage key={mode} mode={mode} />;
}
function Shell() {
  const { user, state: s, refresh, toast } = useApp(),
    navigate = useNavigate(),
    location = useLocation();
  const [assistant, setAssistant] = useState(false),
    [reminders, setReminders] = useState(false);
  const now = new Date(),
    hour = +new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: s!.profile.timezone,
    }).format(now);
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const links = [
    { to: '/', label: 'Home', icon: House },
    { to: '/nutrition', label: 'Nutrition', icon: Utensils },
    { to: '/workouts', label: 'Workouts', icon: Dumbbell },
    { to: '/profile', label: 'Profile', icon: UserRound },
  ];
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-caption">YOUR EVERYDAY COMPANION</div>
        <nav aria-label="Primary navigation">
          {links.map((l) => (
            <NavLink
              aria-label={l.label}
              end={l.to === '/'}
              to={l.to}
              key={l.to}
              onClick={() => {
                if (s!.date !== s!.today) refresh().catch(() => {});
              }}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <l.icon size={21} />
              <span>{l.label}</span>
              <span className="nav-dot" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="mini-mark">
              <Dumbbell size={22} />
            </span>
            <h3>
              Progress is
              <br />a daily practice.
            </h3>
            <p>Keep showing up for yourself.</p>
            <span className="note-line" />
          </div>
          <button className="sidebar-profile" onClick={() => navigate('/profile')}>
            <Avatar user={user!} size={36} />
            <span>
              <strong>{user!.name.split(' ')[0]}</strong>
              <small>Your personal space</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-greeting">
            <span>
              {greeting}, <strong>{user!.name.split(' ')[0]}</strong>{' '}
              <span className="greeting-sun">✳</span>
            </span>
            <small>
              {now.toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                timeZone: s!.profile.timezone,
              })}
            </small>
          </div>
          <div className="topbar-actions">
            <ConnectionButton />
            <button className="assistant-button" onClick={() => setAssistant(true)}>
              <Sparkles size={17} />
              <span>Ask FitTrack</span>
            </button>
            <button
              className="icon-btn notification-btn"
              aria-label="Daily reminders"
              onClick={() => setReminders(true)}
            >
              <Bell size={21} />
              {s!.settings.notifications && <i />}
            </button>
            <button
              className="avatar-button"
              aria-label="Open your profile"
              onClick={() => navigate('/profile')}
            >
              <Avatar user={user!} size={38} />
            </button>
          </div>
        </header>
        <main id="main-content" className="page-content" key={location.pathname}>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>A little better, every day.</span>
          <span>FITTRACK AI</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile primary navigation">
        {links.map((l) => (
          <NavLink
            aria-label={l.label}
            end={l.to === '/'}
            key={l.to}
            to={l.to}
            onClick={() => {
              if (s!.date !== s!.today) refresh().catch(() => {});
            }}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {l.to === '/profile' && user!.photoUrl ? (
              <Avatar user={user!} size={23} />
            ) : (
              <l.icon size={22} />
            )}
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      {assistant && <Assistant onClose={() => setAssistant(false)} />}
      {reminders && (
        <Modal title="Your daily reminders" onClose={() => setReminders(false)}>
          {!s!.settings.notifications ? (
            <>
              <p className="muted">
                Enable daily reminders in Profile to see your remaining nutrition, hydration and
                workout goals here.
              </p>
              <Button
                onClick={() => {
                  setReminders(false);
                  navigate('/profile');
                }}
              >
                Open preferences
              </Button>
            </>
          ) : (
            <div className="reminder-list">
              <p>
                <Check size={18} />
                {Math.max(0, Math.round(s!.profile.targets.calories - s!.totals.calories))} kcal
                left to reach your target
              </p>
              <p>
                <Check size={18} />
                {Math.max(0, s!.profile.targets.water - s!.water)} ml left to your water target
              </p>
              <p>
                <Dumbbell size={18} />
                {s!.plan?.rest
                  ? 'A scheduled rest day. Make time for recovery.'
                  : `${s!.plan?.exercises.filter((e: any) => !e.completed).length || 0} exercises still pending`}
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthGuard mode="login" />} />
          <Route path="/register" element={<AuthGuard mode="register" />} />
          <Route path="/forgot-password" element={<AuthGuard mode="forgot" />} />
          <Route path="/reset-password" element={<AuthGuard mode="reset" />} />
          <Route path="/onboarding" element={<Guard onboarding />} />
          <Route element={<Guard />}>
            <Route index element={<Home />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="workouts" element={<Workouts />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

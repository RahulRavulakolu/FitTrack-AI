import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Pencil,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  Lock,
  Trash2,
  Download,
  Scale,
  Plus,
  Check,
  Bell,
  Sparkles,
  UserRound,
  Target,
  Utensils,
  Dumbbell,
} from 'lucide-react';
import { useApp, api, errorMessage } from '../lib/app';
import { isNative, shareDataExport } from '../lib/native';
import { Avatar, Button, Empty, Field, Modal, SectionTitle, Select, Stat } from '../components/ui';
import { PhotoUpload } from '../components/MediaPicker';
import { ProfileFields, goalOptions, activityOptions } from './Onboarding';
import { QuickLog } from '../components/QuickLog';
import { TrendChart } from '../components/Charts';
import { nutrition, profileSchema, addDays, type FitnessProfile } from '../../shared/domain';
function EditProfile({ initialSection, onClose }: { initialSection: number; onClose: () => void }) {
  const { state: s, mutate, busy, toast } = useApp();
  const [value, setValue] = useState<FitnessProfile>({ ...s!.profile, name: s!.user.name }),
    [section, setSection] = useState(initialSection),
    [confirmed, setConfirmed] = useState(false);
  const replaces = s!.profile.customTargets && !value.customTargets;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(value);
    if (!parsed.success) {
      toast(parsed.error.issues.map((i) => i.message).join(', '), true);
      return;
    }
    try {
      await mutate(
        'put',
        '/profile',
        { ...parsed.data, confirmReplaceTargets: confirmed },
        'Your profile is updated',
      );
      onClose();
    } catch {}
  }
  return (
    <Modal title="Your plan, your way" onClose={onClose} wide>
      <div className="content-tabs compact-tabs">
        <div>
          {['Personal', 'Training', 'Goal', 'Food', 'Targets'].map((t, i) => (
            <button
              key={t}
              className={section === i + 1 ? 'active' : ''}
              onClick={() => setSection(i + 1)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={save}>
        <ProfileFields value={value} onChange={setValue} section={section} />
        {replaces && (
          <label className="check-label">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Replace my customized targets with the newly calculated recommendations.
          </label>
        )}
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Profile() {
  const { state: s, user, setUser, mutate, busy, theme, setTheme, toast } = useApp(),
    navigate = useNavigate();
  const [photo, setPhoto] = useState(false),
    [edit, setEdit] = useState(0),
    [weight, setWeight] = useState(false),
    [modal, setModal] = useState<'password' | 'delete' | 'logout' | null>(null),
    [password, setPassword] = useState(''),
    [nextPassword, setNextPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [working, setWorking] = useState(false),
    [period, setPeriod] = useState(30);
  if (!s || !user) return null;
  const recommended = nutrition(s.profile),
    records = s.weights.filter((w) => w.date >= addDays(s.today, -period));
  const delta = (n: number) => {
    const prev = s.weights.filter((w) => w.date <= addDays(s.today, -n)).at(-1);
    return prev
      ? `${s.profile.weight - prev.weight >= 0 ? '+' : ''}${(s.profile.weight - prev.weight).toFixed(1)} kg`
      : 'Not enough history';
  };
  async function account(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    try {
      if (modal === 'password') {
        await api.post('/auth/password', { currentPassword: password, password: nextPassword });
        toast('Password changed. Other sessions have been signed out.');
        setModal(null);
        setPassword('');
        setNextPassword('');
      } else if (modal === 'delete') {
        await api.delete('/auth/account', { data: { password, confirmation } });
        setUser(null);
        navigate('/login', { replace: true });
        toast('Your account and personal records have been permanently deleted.');
      } else {
        await api.post('/auth/logout', {});
        setUser(null);
        navigate('/login');
      }
    } catch (e) {
      toast(errorMessage(e), true);
    } finally {
      setWorking(false);
    }
  }
  async function exportData() {
    try {
      const { data } = await api.get('/export');
      if (isNative) {
        await shareDataExport(data, s!.today);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack-export-${s!.today}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Your data export is ready');
    } catch (e) {
      toast(errorMessage(e), true);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PERSONAL, IN EVERY WAY</span>
          <h1>Your profile.</h1>
          <p>The details that make this journey yours.</p>
        </div>
        <Button variant="secondary" onClick={() => setEdit(1)}>
          <Pencil size={17} />
          Edit profile
        </Button>
      </div>
      <section className="card profile-hero">
        <div className="profile-photo">
          <Avatar user={user} size={100} />
          <button aria-label="Change profile photo" onClick={() => setPhoto(true)}>
            <Camera size={17} />
          </button>
        </div>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="pill">{goalOptions.find((g) => g.value === s.profile.goal)?.label}</span>
        </div>
        <div className="profile-hero-actions">
          <Button variant="secondary" onClick={() => setPhoto(true)}>
            <Camera size={17} />
            {user.photoUrl ? 'Change photo' : 'Add photo'}
          </Button>
          {user.photoUrl && (
            <button
              className="subtle-link danger-text"
              disabled={busy}
              onClick={() =>
                mutate('delete', '/photo', {}, 'Profile photo removed').catch(() => {})
              }
            >
              Remove photo
            </button>
          )}
        </div>
      </section>
      <div className="profile-grid">
        <div className="main-column">
          <section className="card">
            <SectionTitle title="The basics">
              <UserRound size={21} />
            </SectionTitle>
            <dl className="profile-details">
              {[
                ['Age', `${s.profile.age} years`],
                ['Height', `${s.profile.height} cm`],
                ['Current weight', `${s.profile.weight} kg`],
                [
                  'Calorie equation',
                  s.profile.gender === 'other' ? 'Midpoint estimate' : s.profile.gender,
                ],
                [
                  'Activity level',
                  activityOptions
                    .find((a) => a.value === s.profile.activity)
                    ?.label.split(' · ')[0],
                ],
                ['Food budget', `₹${s.profile.budget} / ${s.profile.budgetPeriod}`],
                ['Timezone', s.profile.timezone],
                ['Training', `${s.profile.experience} · ${s.profile.equipment}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="card">
            <SectionTitle
              title="Your daily targets"
              eyebrow={s.profile.customTargets ? 'CUSTOMIZED BY YOU' : 'PERSONALIZED ESTIMATES'}
            >
              <button className="text-link" onClick={() => setEdit(5)}>
                Adjust targets <Pencil size={15} />
              </button>
            </SectionTitle>
            <div className="target-grid">
              {Object.entries(s.profile.targets)
                .filter(([key]) => ['calories', 'protein', 'carbs', 'fats', 'water'].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong>
                      {value.toLocaleString()}
                      <small>{key === 'water' ? 'ml' : key === 'calories' ? 'kcal' : 'g'}</small>
                    </strong>
                  </div>
                ))}
            </div>
            <div className="estimate-strip">
              <span>
                BMR <strong>{recommended.bmr} kcal</strong>
              </span>
              <span>
                Maintenance <strong>{recommended.tdee} kcal</strong>
              </span>
            </div>
            <p className="hint">
              Recommendations update with your profile. Customized targets are preserved until you
              explicitly replace them.
            </p>
          </section>
          <section className="card">
            <SectionTitle title="Look how far you’ve come" eyebrow="WEIGHT PROGRESS">
              <Button variant="secondary" onClick={() => setWeight(true)}>
                <Plus size={17} />
                Check in
              </Button>
            </SectionTitle>
            <div className="weight-heading">
              <strong>
                {s.profile.weight}
                <small> kg</small>
              </strong>
              <div className="segmented small">
                {[7, 30, 90].map((d) => (
                  <button
                    className={period === d ? 'active' : ''}
                    key={d}
                    onClick={() => setPeriod(d)}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>
            {records.length > 1 ? (
              <TrendChart data={records} height={220} />
            ) : (
              <Empty
                icon={Scale}
                title="Room to grow"
                description="Log another weight check-in to see your progress chart."
              />
            )}
            <div className="report-summary">
              <span>
                <strong>{delta(7)}</strong>over 7 days
              </span>
              <span>
                <strong>{delta(30)}</strong>over 30 days
              </span>
              <span>
                <strong>{s.weights.length}</strong>check-ins recorded
              </span>
            </div>
            <details className="weight-history">
              <summary>View weight history</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.weights
                      .slice()
                      .reverse()
                      .map((w) => (
                        <tr key={w._id}>
                          <td>{w.date}</td>
                          <td>{w.weight} kg</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="card">
            <SectionTitle title="Your consistency" eyebrow="LAST 30 DAYS" />
            <div className="activity-grid">
              <Stat
                label="Workout days"
                value={
                  s.streak.calendar.slice(-30).filter((d: any) => d.status === 'completed').length
                }
              />
              <Stat label="Days with food logs" value={s.reports.filter((r) => r.logged).length} />
              <Stat label="Personal records" value={s.records.length} />
            </div>
            <TrendChart
              data={s.streak.calendar
                .slice(-30)
                .map((d: any) => ({ date: d.date, workout: d.status === 'completed' ? 1 : 0 }))}
              dataKey="workout"
              unit="workout"
              bars
              color="var(--lavender)"
              height={150}
            />
          </section>
        </div>
        <aside className="side-column">
          <section className="card">
            <SectionTitle title="Make yourself at home" />
            <span className="setting-label">APPEARANCE</span>
            <div className="theme-options">
              {[
                { key: 'light', icon: Sun, label: 'Light' },
                { key: 'dark', icon: Moon, label: 'Dark' },
                { key: 'system', icon: Monitor, label: 'System' },
              ].map((t) => (
                <button
                  key={t.key}
                  disabled={busy}
                  className={theme === t.key ? 'active' : ''}
                  onClick={() =>
                    mutate('put', '/settings', { theme: t.key }, 'Appearance updated')
                      .then(() => setTheme(t.key))
                      .catch(() => {})
                  }
                >
                  <t.icon size={20} />
                  {t.label}
                </button>
              ))}
            </div>
            <Select
              label="Workout weight unit"
              value={s.settings.weightUnit}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'lbs', label: 'Pounds (lbs)' },
              ]}
              onChange={(e) =>
                mutate(
                  'put',
                  '/settings',
                  { weightUnit: e.target.value },
                  'Weight unit updated',
                ).catch(() => {})
              }
            />
            <button className="setting-row" onClick={() => setEdit(4)}>
              <Utensils size={18} />
              <span>
                Food preferences<small>{s.profile.preference}</small>
              </span>
              <Pencil size={15} />
            </button>
            <button className="setting-row" onClick={() => setEdit(2)}>
              <Dumbbell size={18} />
              <span>
                Workout preferences<small>{s.profile.duration}-minute sessions</small>
              </span>
              <Pencil size={15} />
            </button>
            <label className="setting-row">
              <Bell size={18} />
              <span>
                Daily reminders<small>Show in-app reminders in the bell menu</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={s.settings.notifications}
                disabled={busy}
                onChange={(e) =>
                  mutate(
                    'put',
                    '/settings',
                    { notifications: e.target.checked },
                    'Reminder preference saved',
                  ).catch(() => {})
                }
              />
            </label>
          </section>
          <section className="card privacy-card">
            <SectionTitle title="Privacy & AI">
              <ShieldCheck size={21} />
            </SectionTitle>
            <p className="hint">
              AI runs on your FitTrack server using a free downloaded model. Your phone
              sends photos or relevant records to that server only when you request an analysis,
              routine or answer. No paid AI API is used.
            </p>
            <label className="setting-row">
              <Sparkles size={19} />
              <span>Enable local AI</span>
              <input
                type="checkbox"
                role="switch"
                checked={s.settings.localAiEnabled !== false}
                disabled={busy}
                onChange={(e) =>
                  mutate(
                    'put',
                    '/settings',
                    { localAiEnabled: e.target.checked },
                    'AI privacy preference saved',
                  ).catch(() => {})
                }
              />
            </label>
            <button className="setting-row" onClick={exportData}>
              <Download size={18} />
              <span>Download my data</span>
            </button>
            <small className="hint">
              {s.services.cloudImages
                ? 'Your account records are private. Cloudinary-hosted photos use public asset URLs; anyone with a direct photo link may view it.'
                : 'Your account records and photos are private. Saved photos can only be opened while signed in to your account.'}
            </small>
          </section>
          <section className="card account-card">
            <SectionTitle title="Account" />
            <button
              className="setting-row"
              onClick={() => {
                setPassword('');
                setModal('password');
              }}
            >
              <Lock size={18} />
              <span>Change password</span>
            </button>
            <button className="setting-row" onClick={() => setModal('logout')}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
            <button
              className="setting-row danger-text"
              onClick={() => {
                setPassword('');
                setConfirmation('');
                setModal('delete');
              }}
            >
              <Trash2 size={18} />
              <span>Delete account</span>
            </button>
          </section>
        </aside>
      </div>
      {photo && <PhotoUpload onClose={() => setPhoto(false)} />}
      {edit > 0 && <EditProfile initialSection={edit} onClose={() => setEdit(0)} />}
      {weight && <QuickLog kind="weight" onClose={() => setWeight(false)} />}
      {modal && (
        <Modal
          title={
            modal === 'password'
              ? 'Change your password'
              : modal === 'delete'
                ? 'Delete your account permanently?'
                : 'See you next session.'
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={account}>
            {modal === 'logout' ? (
              <p className="muted">
                Your progress is saved. You can pick up where you left off when you sign in again.
              </p>
            ) : (
              <>
                <p className="muted">
                  {modal === 'delete'
                    ? 'This removes your profile, photos, food logs, workout history and all associated personal records. This cannot be undone.'
                    : 'Choose a password with at least 10 characters. Other sessions will be signed out.'}
                </p>
                <Field
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {modal === 'password' ? (
                  <Field
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    maxLength={72}
                    value={nextPassword}
                    onChange={(e) => setNextPassword(e.target.value)}
                  />
                ) : (
                  <Field
                    label="Type DELETE to confirm"
                    required
                    pattern="DELETE"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                )}
              </>
            )}
            <div className="modal-actions">
              <Button variant="ghost" type="button" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button variant={modal === 'delete' ? 'danger' : ''} busy={working} type="submit">
                {modal === 'password'
                  ? 'Update password'
                  : modal === 'delete'
                    ? 'Delete permanently'
                    : 'Log out'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

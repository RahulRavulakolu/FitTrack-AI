import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Camera,
  Flame,
  Leaf,
  Target,
  TrendingUp,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { profileSchema, nutrition, type FitnessProfile } from '../../shared/domain';
import { api, errorMessage, useApp } from '../lib/app';
import { Avatar, Brand, Button, Field, Select } from '../components/ui';
import { PhotoUpload } from '../components/MediaPicker';
export const activityOptions = [
  { value: 'sedentary', label: 'Sedentary · little or no exercise' },
  { value: 'light', label: 'Lightly active · 1–2 days / week' },
  { value: 'moderate', label: 'Moderately active · 3–4 days / week' },
  { value: 'very', label: 'Very active · 5–6 days / week' },
  { value: 'extreme', label: 'Extremely active · daily intense training' },
];
export const goalOptions = [
  {
    value: 'bulking',
    label: 'Build muscle',
    description: 'A moderate surplus to support growth.',
    icon: TrendingUp,
  },
  {
    value: 'cutting',
    label: 'Lose body fat',
    description: 'A measured deficit. Keep your strength.',
    icon: Flame,
  },
  {
    value: 'maintenance',
    label: 'Maintain weight',
    description: 'Fuel your routine and find your balance.',
    icon: Target,
  },
  {
    value: 'recomposition',
    label: 'Body recomposition',
    description: 'Build muscle while gradually reducing fat.',
    icon: Sparkles,
  },
];
export function defaultProfile(name: string): FitnessProfile {
  return {
    name,
    age: 25,
    gender: 'male',
    height: 170,
    weight: 70,
    activity: 'moderate',
    goal: 'maintenance',
    budget: 300,
    budgetPeriod: 'daily',
    preference: 'vegetarian',
    allergies: '',
    restrictions: '',
    dislikes: '',
    walking: '',
    experience: 'beginner',
    equipment: 'gym',
    duration: 45,
    recovery: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    customTargets: false,
  };
}
export function ProfileFields({
  value,
  onChange,
  section,
}: {
  value: FitnessProfile;
  onChange: (v: FitnessProfile) => void;
  section: number;
}) {
  const set = (key: keyof FitnessProfile, v: any) => onChange({ ...value, [key]: v });
  if (section === 1)
    return (
      <div className="form-grid">
        <Field
          label="Full name"
          required
          value={value.name}
          minLength={2}
          maxLength={80}
          onChange={(e) => set('name', e.target.value)}
        />
        <Field
          label="Age"
          type="number"
          required
          min={18}
          max={100}
          value={value.age || ''}
          onChange={(e) => set('age', +e.target.value)}
        />
        <Select
          label="Sex used for calorie estimate"
          value={value.gender}
          onChange={(e) => set('gender', e.target.value)}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Use midpoint estimate' },
          ]}
        />
        <Field
          label="Height (cm)"
          type="number"
          required
          min={100}
          max={250}
          value={value.height || ''}
          onChange={(e) => set('height', +e.target.value)}
        />
        <Field
          label="Current weight (kg)"
          type="number"
          required
          step="0.1"
          min={30}
          max={350}
          value={value.weight || ''}
          onChange={(e) => set('weight', +e.target.value)}
        />
      </div>
    );
  if (section === 2)
    return (
      <>
        <Select
          label="Weekly activity level"
          value={value.activity}
          onChange={(e) => set('activity', e.target.value)}
          options={activityOptions}
        />
        <Field
          label="Daily walking & general activity (optional)"
          placeholder="e.g. a 20-minute walk after lunch"
          value={value.walking}
          maxLength={300}
          onChange={(e) => set('walking', e.target.value)}
        />
        <div className="form-grid">
          <Select
            label="Training experience"
            value={value.experience}
            onChange={(e) => set('experience', e.target.value)}
            options={['beginner', 'intermediate', 'advanced']}
          />
          <Select
            label="Available equipment"
            value={value.equipment}
            onChange={(e) => set('equipment', e.target.value)}
            options={[
              { value: 'gym', label: 'Full gym' },
              { value: 'dumbbells', label: 'Dumbbells' },
              { value: 'bodyweight', label: 'Bodyweight only' },
            ]}
          />
          <Field
            label="Workout duration (minutes)"
            type="number"
            min={15}
            max={120}
            required
            value={value.duration}
            onChange={(e) => set('duration', +e.target.value)}
          />
        </div>
        <Field
          label="Recovery needs or movement limitations (optional)"
          value={value.recovery}
          maxLength={500}
          onChange={(e) => set('recovery', e.target.value)}
          hint="Choose comfortable movements. AI-generated plans can take these notes into account."
        />
      </>
    );
  if (section === 3)
    return (
      <div className="goal-options">
        {goalOptions.map((g) => (
          <button
            key={g.value}
            type="button"
            className={`goal-option ${value.goal === g.value ? 'selected' : ''}`}
            onClick={() => set('goal', g.value)}
          >
            <g.icon size={24} />
            <span>
              <strong>{g.label}</strong>
              <small>{g.description}</small>
            </span>
            <span className="radio-dot">{value.goal === g.value && <Check size={13} />}</span>
          </button>
        ))}
      </div>
    );
  if (section === 4)
    return (
      <>
        <div className="form-grid">
          <Field
            label="Food budget (₹)"
            type="number"
            min={0}
            max={1000000}
            required
            value={value.budget}
            onChange={(e) => set('budget', +e.target.value)}
          />
          <Select
            label="Budget period"
            value={value.budgetPeriod}
            onChange={(e) => set('budgetPeriod', e.target.value)}
            options={['daily', 'weekly', 'monthly']}
          />
        </div>
        <Select
          label="Food preference"
          value={value.preference}
          onChange={(e) => set('preference', e.target.value)}
          options={['vegetarian', 'non-vegetarian', 'eggetarian', 'vegan']}
        />
        <Field
          label="Food allergies (optional)"
          value={value.allergies}
          maxLength={500}
          placeholder="e.g. peanuts, dairy"
          onChange={(e) => set('allergies', e.target.value)}
        />
        <Field
          label="Dietary restrictions (optional)"
          value={value.restrictions}
          maxLength={500}
          onChange={(e) => set('restrictions', e.target.value)}
        />
        <Field
          label="Foods you dislike (optional)"
          value={value.dislikes}
          maxLength={500}
          onChange={(e) => set('dislikes', e.target.value)}
        />
      </>
    );
  const recommended = nutrition(value),
    targets = value.customTargets ? value.targets || recommended : recommended;
  return (
    <>
      <div className="estimate-strip">
        <span>
          BMR <strong>{recommended.bmr.toLocaleString()} kcal</strong>
        </span>
        <span>
          Maintenance / TDEE <strong>{recommended.tdee.toLocaleString()} kcal</strong>
        </span>
      </div>
      <div className="segmented">
        <button
          type="button"
          className={!value.customTargets ? 'active' : ''}
          onClick={() => onChange({ ...value, customTargets: false })}
        >
          Use recommended targets
        </button>
        <button
          type="button"
          className={value.customTargets ? 'active' : ''}
          onClick={() => onChange({ ...value, customTargets: true, targets: { ...targets } })}
        >
          Customize my targets
        </button>
      </div>
      <div className="form-grid">
        {(['calories', 'protein', 'carbs', 'fats', 'water'] as const).map((key) => (
          <Field
            key={key}
            label={`${key === 'water' ? 'Water' : key[0].toUpperCase() + key.slice(1)} (${key === 'calories' ? 'kcal' : key === 'water' ? 'ml' : 'g'})`}
            type="number"
            required
            disabled={!value.customTargets}
            min={key === 'calories' ? 1000 : key === 'water' ? 500 : 20}
            max={
              key === 'calories'
                ? 7000
                : key === 'water'
                  ? 8000
                  : key === 'protein'
                    ? 400
                    : key === 'carbs'
                      ? 1000
                      : 250
            }
            value={targets[key]}
            onChange={(e) =>
              onChange({ ...value, targets: { ...targets, [key]: +e.target.value } })
            }
          />
        ))}
      </div>
      <p className="hint">
        Based on the Mifflin–St Jeor equation and your activity level. These are estimates, not
        medical prescriptions. The midpoint option averages the equation’s sex-based constants.
      </p>
      {value.customTargets &&
        Math.abs(targets.protein * 4 + targets.carbs * 4 + targets.fats * 9 - targets.calories) >
          150 && (
          <p className="hint amber-text">
            Your macro energy differs from your calorie target. You can keep this intentional custom
            balance or adjust it.
          </p>
        )}
    </>
  );
}
export function Onboarding() {
  const { user, setUser, setState } = useApp(),
    navigate = useNavigate();
  const [step, setStep] = useState(0),
    [profile, setProfile] = useState(defaultProfile(user!.name)),
    [photo, setPhoto] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const titles = [
    'Welcome to FitTrack AI!',
    'Let’s start with you.',
    'Find your rhythm.',
    'What are you working toward?',
    'Good food. Your way.',
    'Your daily fuel, calculated.',
    'You’re ready to begin.',
  ];
  async function next(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (step === 6) {
      const parsed = profileSchema.safeParse(profile);
      if (!parsed.success) {
        setError(parsed.error.issues.map((i) => i.message).join(', '));
        return;
      }
      setBusy(true);
      try {
        const { data } = await api.put('/profile', parsed.data);
        setState(data);
        setUser(data.user);
        navigate('/', { replace: true });
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    } else setStep(step + 1);
  }
  return (
    <main className="onboarding">
      <header>
        <Brand />
        <span className="muted">A plan that feels like you</span>
      </header>
      <div className="onboarding-layout">
        <aside>
          <span className="eyebrow">THE FIRST STEP IS YOURS</span>
          <h1>
            Your goals.
            <br />
            Your pace.
            <br />
            <em>Your journey.</em>
          </h1>
          <div className="onboarding-steps">
            {[
              'About you',
              'Activity & training',
              'Your goal',
              'Food & budget',
              'Daily targets',
              'Ready to go',
            ].map((s, i) => (
              <div key={s} className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''}>
                <span>{step > i + 1 ? <Check size={16} /> : String(i + 1).padStart(2, '0')}</span>
                {s}
              </div>
            ))}
          </div>
        </aside>
        <section className="onboard-card">
          {step > 0 && <span className="eyebrow">STEP {step} OF 6</span>}
          <h2>{titles[step]}</h2>
          <p className="muted">
            {step === 0
              ? 'Let’s understand your body, fitness goals, and lifestyle to create your personalized fitness plan.'
              : step === 1
                ? 'A few details to personalize your daily targets. FitTrack is for adults 18 and older.'
                : step === 2
                  ? 'Choose the routine that reflects a typical week.'
                  : step === 3
                    ? 'This is your starting point. You can change it any time.'
                    : step === 4
                      ? 'Practical nutrition starts with your preferences.'
                      : step === 5
                        ? 'A starting point you can make your own.'
                        : 'Your profile and a balanced three-day training schedule will be saved.'}
          </p>
          <form onSubmit={next}>
            {step === 0 ? (
              <div className="welcome-mark">
                <ActivityMark />
              </div>
            ) : step === 6 ? (
              <div className="ready-summary">
                <Avatar user={user!} size={72} />
                <h3>{profile.name}</h3>
                <div className="pill">
                  {goalOptions.find((g) => g.value === profile.goal)?.label}
                </div>
                <div className="ready-stats">
                  <span>
                    <strong>
                      {(profile.customTargets ? profile.targets : nutrition(profile))?.calories}
                    </strong>
                    kcal / day
                  </span>
                  <span>
                    <strong>{profile.duration} min</strong>training sessions
                  </span>
                  <span>
                    <strong>₹{profile.budget}</strong>
                    {profile.budgetPeriod} food budget
                  </span>
                </div>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="photo-row">
                    <Avatar user={user!} size={62} />
                    <Button type="button" variant="secondary" onClick={() => setPhoto(true)}>
                      <Camera size={17} />
                      Add photo <small>optional</small>
                    </Button>
                  </div>
                )}
                <ProfileFields value={profile} onChange={setProfile} section={step} />
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              {step > 0 && (
                <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={17} />
                  Back
                </Button>
              )}
              <Button type="submit" busy={busy}>
                {step === 0
                  ? 'Start your fitness journey'
                  : step === 6
                    ? 'Let’s do this'
                    : 'Continue'}
                <ArrowRight size={17} />
              </Button>
            </div>
          </form>
        </section>
      </div>
      {photo && <PhotoUpload onClose={() => setPhoto(false)} />}
    </main>
  );
}
function ActivityMark() {
  return (
    <div>
      <UserRound size={44} />
      <span>
        <Leaf size={28} />
      </span>
      <span>
        <Flame size={30} />
      </span>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Footprints,
  Timer,
  Zap,
  Droplets,
  Plus,
  Utensils,
  Scale,
  Dumbbell,
  Check,
  Leaf,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../lib/app';
import { Button, Empty, Progress, Ring, SectionTitle, Stat, TextLink } from '../components/ui';
import { QuickLog } from '../components/QuickLog';
import { TrendChart } from '../components/Charts';
import { StreakCalendar } from '../components/StreakCalendar';
import { HealthConnect } from '../components/HealthConnect';
export function Home() {
  const { state: s, refresh, mutate, busy } = useApp(),
    navigate = useNavigate();
  const [modal, setModal] = useState<'activity' | 'weight' | null>(null);
  useEffect(() => {
    if (s && s.date !== s.today) refresh().catch(() => {});
  }, []);
  if (!s) return null;
  const { totals, profile, plan, streak } = s;
  const targets = profile.targets,
    done = plan?.exercises.filter((e: any) => e.completed).length || 0,
    total = plan?.exercises.length || 0;
  const weekly = s.reports.slice(-7),
    trained = streak.calendar.slice(-7).filter((d: any) => d.status === 'completed').length;
  const first = s.weights[0],
    last = s.weights.at(-1),
    change = first && last ? last.weight - first.weight : 0;
  return (
    <>
      <section className="dashboard-intro">
        <div>
          <span className="eyebrow">
            <span className="status-dot" /> YOUR DAILY OVERVIEW
          </span>
          <h1>
            Make today <em>count.</em>
          </h1>
          <p>Every meal. Every rep. A little closer to your goals.</p>
        </div>
        <Button onClick={() => navigate('/nutrition?log=1')}>
          <Plus size={18} />
          Log food
        </Button>
      </section>
      <div className="dashboard-grid">
        <div className="main-column">
          <section className="card nutrition-overview">
            <SectionTitle title="Your daily fuel" eyebrow="NUTRITION">
              <TextLink onClick={() => navigate('/nutrition')}>View nutrition</TextLink>
            </SectionTitle>
            <div className="fuel-layout">
              <div className="calorie-ring">
                <Ring value={totals.calories} target={targets.calories} size={184}>
                  <Flame size={19} />
                  <strong>{Math.round(totals.calories).toLocaleString()}</strong>
                  <span>of {targets.calories.toLocaleString()} kcal</span>
                </Ring>
                <span className="remaining">
                  <i />
                  {Math.max(
                    0,
                    Math.round(targets.calories - totals.calories),
                  ).toLocaleString()}{' '}
                  kcal remaining
                  {totals.calories > targets.calories &&
                    ` · ${Math.round(totals.calories - targets.calories)} over`}
                </span>
              </div>
              <div className="macro-list">
                {[
                  { key: 'protein', label: 'Protein', color: 'var(--lavender)' },
                  { key: 'carbs', label: 'Carbs', color: 'var(--amber)' },
                  { key: 'fats', label: 'Fats', color: 'var(--blue)' },
                ].map((m) => (
                  <div className="macro" key={m.key}>
                    <div>
                      <span>
                        <i style={{ background: m.color }} />
                        {m.label}
                      </span>
                      <span>
                        <strong>{Math.round(totals[m.key])}</strong> /{' '}
                        {targets[m.key as keyof typeof targets]} g
                      </span>
                    </div>
                    <Progress
                      value={totals[m.key]}
                      target={targets[m.key as keyof typeof targets]}
                      color={m.color}
                    />
                    <small>
                      {Math.max(
                        0,
                        Math.round(targets[m.key as keyof typeof targets] - totals[m.key]),
                      )}{' '}
                      g left
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="card workout-preview">
            <div className="workout-visual">
              <Dumbbell size={70} strokeWidth={1.2} />
              <span>SHOW UP FOR YOU</span>
            </div>
            <div className="workout-preview-info">
              <span className="eyebrow">TODAY’S WORKOUT</span>
              <h2>
                {plan?.rest
                  ? 'Rest. Recover. Recharge.'
                  : plan?.muscles.join(' + ') || 'Your next session'}
              </h2>
              <p>
                {plan?.rest
                  ? 'Give your muscles space to get stronger. Rest days keep your streak safe.'
                  : `${total} exercises · ${profile.duration} min estimated · ${profile.experience}`}
              </p>
              {!plan?.rest && (
                <div className="workout-mini-progress">
                  <Progress value={done} target={total} />
                  <span>
                    {done}/{total} complete
                  </span>
                </div>
              )}
              <Button variant="secondary" onClick={() => navigate('/workouts')}>
                {plan?.rest ? 'View your schedule' : 'View today’s workout'}
                <ArrowRight size={17} />
              </Button>
            </div>
          </section>
          <section className="card">
            <SectionTitle title="Keep moving" eyebrow="DAILY ACTIVITY">
              <TextLink onClick={() => setModal('activity')}>Log activity</TextLink>
            </SectionTitle>
            <div className="activity-grid">
              <Stat
                label="Steps"
                value={(s.activity?.steps || 0).toLocaleString()}
                icon={Footprints}
                detail={`${s.activity?.distance || 0} km walked`}
              />
              <Stat label="Active time" value={s.activity?.minutes || 0} unit="min" icon={Timer} />
              <Stat
                label="Energy burned"
                value={s.activity?.calories || 0}
                unit="kcal"
                icon={Zap}
              />
              <Stat label="Workout" value={plan?.duration || 0} unit="min" icon={Dumbbell} />
            </div>
            {!s.activity && (
              <p className="hint">
                No activity recorded yet. Add your actual daily totals when you’re ready.
              </p>
            )}
            <HealthConnect />
          </section>
          <div className="two-col">
            <section className="card">
              <SectionTitle title="Your weight journey">
                <TextLink onClick={() => setModal('weight')}>Check in</TextLink>
              </SectionTitle>
              <div className="weight-heading">
                <strong>
                  {profile.weight}
                  <small> kg</small>
                </strong>
                <span>
                  {s.weights.length > 1
                    ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg since first check-in`
                    : 'Your starting point'}
                </span>
              </div>
              {s.weights.length > 1 ? (
                <TrendChart data={s.weights.slice(-30)} height={155} />
              ) : (
                <Empty
                  icon={Scale}
                  title="Every journey starts somewhere"
                  description="Add another check-in to see your trend."
                />
              )}
            </section>
            <section className="card">
              <SectionTitle title="Today, so far" />
              <div className="today-log">
                {done > 0 && (
                  <div>
                    <span className="log-symbol">
                      <Dumbbell size={16} />
                    </span>
                    <p>
                      <strong>
                        {done} exercise{done > 1 ? 's' : ''} completed
                      </strong>
                      <small>{plan.muscles.join(' + ')}</small>
                    </p>
                    <Check size={16} />
                  </div>
                )}
                {s.activity?.steps > 0 && (
                  <div>
                    <span className="log-symbol">
                      <Footprints size={16} />
                    </span>
                    <p>
                      <strong>{s.activity.steps.toLocaleString()} steps recorded</strong>
                      <small>{s.activity.minutes} active minutes</small>
                    </p>
                    <Check size={16} />
                  </div>
                )}
                {s.foods.length > 0 && (
                  <div>
                    <span className="log-symbol">
                      <Utensils size={16} />
                    </span>
                    <p>
                      <strong>{s.foods.length} food items logged</strong>
                      <small>{Math.round(totals.calories)} kcal consumed</small>
                    </p>
                    <Check size={16} />
                  </div>
                )}
                {s.water > 0 && (
                  <div>
                    <span className="log-symbol">
                      <Droplets size={16} />
                    </span>
                    <p>
                      <strong>{(s.water / 1000).toFixed(2)} litres of water</strong>
                      <small>Hydration logged</small>
                    </p>
                    <Check size={16} />
                  </div>
                )}
                {!done && !s.activity?.steps && !s.foods.length && !s.water && (
                  <Empty
                    icon={Leaf}
                    title="A fresh page for today"
                    description="Your logged meals and activities will appear here."
                  />
                )}
              </div>
            </section>
          </div>
          <section className="card">
            <SectionTitle title="A week of nourishment" eyebrow="LAST 7 DAYS">
              <TextLink onClick={() => navigate('/nutrition?report=1')}>Full report</TextLink>
            </SectionTitle>
            <TrendChart
              data={weekly}
              dataKey="calories"
              unit="kcal"
              bars
              height={180}
              target={targets.calories}
            />
            <p className="hint">
              Bars show logged intake only. The dotted line is your current daily target.
            </p>
          </section>
        </div>
        <aside className="side-column">
          <section className="streak-card">
            <div className="streak-top">
              <span className="eyebrow">KEEP THE MOMENTUM</span>
              <Flame size={27} />
            </div>
            <div className="streak-number">
              {streak.current}
              <span>day streak</span>
            </div>
            <p>
              {streak.frozen
                ? 'One missed day is covered. Your next session keeps it going.'
                : 'Consistency creates results.'}
            </p>
            <div className="streak-stats">
              <span>
                <strong>{streak.longest}</strong>Longest streak
              </span>
              <span>
                <strong>{streak.total}</strong>Total workout days
              </span>
            </div>
            <div className="consistency">
              <span>This week</span>
              <strong>
                {trained} workout day{trained !== 1 ? 's' : ''}
              </strong>
            </div>
          </section>
          <section className="card calendar-card">
            <StreakCalendar />
          </section>
          <section className="card hydration-card">
            <SectionTitle title="Stay hydrated">
              <Droplets className="blue-text" size={22} />
            </SectionTitle>
            <div className="water-value">
              <strong>{(s.water / 1000).toFixed(2)}</strong>
              <span>/ {(targets.water / 1000).toFixed(1)} L</span>
            </div>
            <Progress value={s.water} target={targets.water} color="var(--blue)" />
            <div className="water-buttons">
              {[250, 500, 750, 1000].map((amount) => (
                <button
                  disabled={busy}
                  key={amount}
                  onClick={() =>
                    mutate(
                      'post',
                      '/water',
                      { date: s.today, amount, requestId: crypto.randomUUID() },
                      'Water logged',
                    ).catch(() => {})
                  }
                >
                  + {amount === 1000 ? '1 L' : `${amount} ml`}
                </button>
              ))}
            </div>
            {s.waterLogs.length > 0 && (
              <button
                className="subtle-link"
                disabled={busy}
                onClick={() =>
                  mutate(
                    'delete',
                    `/water/${s.waterLogs.at(-1)._id}`,
                    {},
                    'Last water entry removed',
                  ).catch(() => {})
                }
              >
                Undo last entry
              </button>
            )}
          </section>
          <section className="card quick-actions">
            <span className="eyebrow">MAKE IT A HABIT</span>
            <h3>Little actions. Big change.</h3>
            {[
              { label: 'Start workout', icon: Dumbbell, action: () => navigate('/workouts') },
              { label: 'Update weight', icon: Scale, action: () => setModal('weight') },
              { label: 'Add activity', icon: Footprints, action: () => setModal('activity') },
            ].map((a) => (
              <button key={a.label} onClick={a.action}>
                <a.icon size={18} />
                {a.label}
                <ArrowUpRight size={17} />
              </button>
            ))}
          </section>
        </aside>
      </div>
      {modal && <QuickLog kind={modal} onClose={() => setModal(null)} />}
    </>
  );
}

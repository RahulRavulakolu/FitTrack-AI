import { useState, useEffect } from 'react';
import {
  Dumbbell,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Timer,
  Trophy,
  Leaf,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Undo2,
  Play,
  ArrowUpRight,
} from 'lucide-react';
import { api, errorMessage, useApp } from '../lib/app';
import {
  Button,
  DatePicker,
  Empty,
  Field,
  Modal,
  Progress,
  SectionTitle,
  Select,
  Stat,
} from '../components/ui';
import { QuickLog } from '../components/QuickLog';
import { TrendChart } from '../components/Charts';
import { ExerciseDemo } from '../components/ExerciseDemo';
import {
  days,
  muscles,
  splitTemplates,
  splitSchema,
  weekday,
  addDays,
  recordMetrics,
  type Split,
} from '../../shared/domain';
export function SplitEditor({
  onClose,
  select = false,
}: {
  onClose: () => void;
  select?: boolean;
}) {
  const { state: s, mutate, busy, toast } = useApp();
  const [split, setSplit] = useState<Split>(
      structuredClone(s!.splits.at(-1) || splitTemplates.starter),
    ),
    [day, setDay] = useState(0),
    [choosing, setChoosing] = useState(select);
  const current = split.days[day];
  function update(value: any) {
    setSplit({ ...split, days: split.days.map((d, i) => (i === day ? { ...d, ...value } : d)) });
  }
  async function save() {
    const parsed = splitSchema.safeParse(split);
    if (!parsed.success) {
      toast(parsed.error.issues.map((i) => i.message).join(', '), true);
      return;
    }
    try {
      const result = await mutate('put', '/split', parsed.data, '');
      toast(result.message);
      onClose();
    } catch {}
  }
  return (
    <Modal
      title={choosing ? 'Choose your workout split' : 'Make your week work for you'}
      onClose={onClose}
      wide
    >
      {choosing ? (
        <>
          <p className="muted">
            Start with a structure, then make it your own. Six training days can be demanding; add
            rest days to suit your recovery.
          </p>
          <div className="split-templates">
            {Object.entries(splitTemplates)
              .filter(([key]) => key !== 'starter')
              .map(([key, value]) => (
                <button
                  key={key}
                  className="template-card"
                  onClick={() => {
                    setSplit(structuredClone(value));
                    setChoosing(false);
                  }}
                >
                  <Layers />
                  <h3>{value.name}</h3>
                  {value.days.slice(0, 3).map((d, i) => (
                    <small key={i}>
                      {days[i].slice(0, 3)} · {d.muscles.join(' + ')}
                    </small>
                  ))}
                  <span>
                    Customize this split <ArrowUpRight size={16} />
                  </span>
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <Field
            label="Schedule name"
            value={split.name}
            maxLength={80}
            onChange={(e) => setSplit({ ...split, name: e.target.value })}
          />
          <div className="split-editor">
            <div className="split-days">
              {days.map((d, i) => (
                <button key={d} className={day === i ? 'active' : ''} onClick={() => setDay(i)}>
                  <strong>{d}</strong>
                  <small>
                    {split.days[i].rest
                      ? 'Rest & recovery'
                      : split.days[i].muscles.join(' + ') || 'Choose muscles'}
                  </small>
                </button>
              ))}
            </div>
            <div className="muscle-picker">
              <h3>{days[day]}</h3>
              <label className="rest-toggle">
                <input
                  type="checkbox"
                  checked={current.rest}
                  disabled={current.muscles.length > 0}
                  onChange={(e) => update({ rest: e.target.checked })}
                />
                <Leaf size={19} />
                <span>Rest & recovery day</span>
              </label>
              <p className="hint">
                Uncheck rest to select muscles. Clear selected muscles to make this a rest day.
              </p>
              <div className="muscle-options">
                {muscles.map((m) => (
                  <label key={m} className={current.muscles.includes(m) ? 'selected' : ''}>
                    <input
                      type="checkbox"
                      disabled={
                        current.rest ||
                        (!current.muscles.includes(m) && current.muscles.length >= 5)
                      }
                      checked={current.muscles.includes(m)}
                      onChange={(e) =>
                        update({
                          muscles: e.target.checked
                            ? [...current.muscles, m]
                            : current.muscles.filter((x) => x !== m),
                        })
                      }
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <p className="hint">
            Historical workouts stay intact. If you’ve already logged sets today, schedule changes
            begin tomorrow.
          </p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button busy={busy} onClick={save}>
              Save weekly schedule
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
function PerformanceHistory({ exercise, onClose }: { exercise: any; onClose: () => void }) {
  const { state: s, toast } = useApp();
  const [logs, setLogs] = useState<any[] | null>(null);
  useEffect(() => {
    api
      .get(`/exercises/${exercise.id}/history`)
      .then((r) => setLogs(r.data))
      .catch((e) => {
        toast(errorMessage(e), true);
        setLogs([]);
      });
  }, [exercise.id]);
  const unit = s!.settings.weightUnit,
    factor = unit === 'lbs' ? 1 / 0.45359237 : 1;
  const dates = [...new Set(logs?.map((l) => l.date) || [])];
  const metrics = logs ? recordMetrics(logs) : null;
  const trend = dates
    .slice()
    .reverse()
    .map((date) => ({
      date,
      weight: recordMetrics(logs!.filter((l) => l.date === date)).weight * factor,
    }));
  const latest = logs?.[0];
  return (
    <Modal title={`${exercise.name} · history`} onClose={onClose} wide>
      {!logs ? (
        <p className="muted">Loading your performance…</p>
      ) : !logs.length ? (
        <Empty
          icon={Trophy}
          title="Your first record is ahead of you"
          description="Save completed sets and confirm an exercise to build its history."
        />
      ) : (
        <>
          <div className="activity-grid">
            <Stat label="Best weight" value={(metrics!.weight * factor).toFixed(1)} unit={unit} />
            <Stat label="Most reps in a set" value={metrics!.reps} />
            <Stat
              label="Estimated 1RM"
              value={(metrics!.oneRepMax * factor).toFixed(1)}
              unit={unit}
            />
          </div>
          <TrendChart data={trend} unit={unit} />
          <div className="info-banner">
            <Sparkles size={20} />
            <p>
              Last session: {latest!.weight} {latest!.unit} × {latest!.reps} reps. If technique and
              recovery feel good, try one additional rep at that same load next time. This
              suggestion never changes your logged weight.
            </p>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Confirmed sets</th>
                  <th>Volume ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr key={date}>
                    <td>{date}</td>
                    <td>
                      {logs
                        .filter((l) => l.date === date)
                        .map((l) => `${l.weight} ${l.unit} × ${l.reps}`)
                        .join(' · ')}
                    </td>
                    <td>
                      {Math.round(
                        recordMetrics(logs.filter((l) => l.date === date)).volume * factor,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Records include confirmed exercises and completed sets only. Estimated 1RM uses the
            Epley formula for sets of 1–12 reps.
          </p>
        </>
      )}
    </Modal>
  );
}
function ExerciseCard({ exercise, index }: { exercise: any; index: number }) {
  const { state: s, mutate, busy, toast } = useApp();
  const [open, setOpen] = useState(false),
    [history, setHistory] = useState(false),
    [demo, setDemo] = useState(false),
    [dirty, setDirty] = useState(false),
    [restUntil, setRestUntil] = useState<number | null>(null),
    [seconds, setSeconds] = useState(0);
  const [sets, setSets] = useState<any[]>(() =>
    Array.from(
      { length: exercise.sets },
      (_, i) =>
        s!.setLogs.find((l) => l.exerciseId === exercise.id && l.setNumber === i + 1) || {
          setNumber: i + 1,
          weight: 0,
          reps: 0,
          unit: s!.settings.weightUnit,
          completed: false,
        },
    ),
  );
  useEffect(() => {
    if (!restUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restUntil - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setRestUntil(null);
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [restUntil]);
  function update(i: number, key: string, value: any) {
    setSets(sets.map((s, n) => (n === i ? { ...s, [key]: value } : s)));
    setDirty(true);
  }
  async function save() {
    try {
      const result = await mutate(
        'put',
        `/workouts/${s!.plan._id}/sets`,
        {
          exerciseId: exercise.id,
          sets: sets.map(({ setNumber, weight, reps, unit, completed }) => ({
            setNumber,
            weight,
            reps,
            unit,
            completed,
          })),
        },
        'Sets saved',
      );
      if (result) setDirty(false);
    } catch {}
  }
  async function complete() {
    if (dirty) {
      toast('Save your sets before confirming this exercise.', true);
      return;
    }
    await mutate(
      'put',
      `/workouts/${s!.plan._id}/complete`,
      { exerciseId: exercise.id, completed: !exercise.completed },
      exercise.completed ? 'Exercise completion undone' : 'Exercise completed. Nice work!',
    ).catch(() => {});
  }
  const volume = recordMetrics(sets).volume;
  return (
    <article className={`exercise-card ${exercise.completed ? 'is-completed' : ''}`}>
      <button className="exercise-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="exercise-index">
          {exercise.completed ? <Check size={21} /> : String(index + 1).padStart(2, '0')}
        </span>
        <span className="exercise-name">
          <strong>{exercise.name}</strong>
          <small>
            {exercise.muscle} <i /> {exercise.sets} sets × {exercise.reps} reps <i />{' '}
            {exercise.rest}s rest
          </small>
        </span>
        {exercise.completed ? (
          <span className="badge">Completed</span>
        ) : (
          <span className="exercise-open">Log sets</span>
        )}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="exercise-body">
          <div className="exercise-guide">
            {exercise.imageUrl && (
              <img
                src={exercise.imageUrl}
                alt={`${exercise.name} demonstration from wger`}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <div>
              <span className="eyebrow">MOVE WITH INTENTION</span>
              <p>{exercise.instructions}</p>
              <div className="button-row">
                {exercise.videoUrl || exercise.imageUrl ? (
                  <button className="text-link" onClick={() => setDemo(true)}>
                    <Play size={15} />
                    Movement guide
                  </button>
                ) : (
                  exercise.mediaSlug && (
                    <a
                      className="text-link"
                      href={`https://www.muscleandstrength.com/exercises/${exercise.mediaSlug}.html`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Play size={15} />
                      Exercise guide
                    </a>
                  )
                )}
                <button className="text-link" onClick={() => setHistory(true)}>
                  <History size={15} />
                  Performance history
                </button>
              </div>
              {exercise.attribution && (
                <small className="media-credit">{exercise.attribution}</small>
              )}
            </div>
          </div>
          <div className="table-scroll">
            <table className="set-table">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Target reps</th>
                  <th>Weight</th>
                  <th>Unit</th>
                  <th>Actual reps</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set, i) => (
                  <tr key={i} className={set.completed ? 'set-completed' : ''}>
                    <td>
                      <span className="set-number">{i + 1}</span>
                    </td>
                    <td>{exercise.reps}</td>
                    <td>
                      <input
                        type="number"
                        aria-label={`${exercise.name} set ${i + 1} weight`}
                        min={0}
                        max={1500}
                        step="0.5"
                        value={set.weight}
                        disabled={exercise.completed}
                        onChange={(e) => update(i, 'weight', +e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Set ${i + 1} weight unit`}
                        disabled={exercise.completed}
                        value={set.unit}
                        onChange={(e) => {
                          const next = e.target.value;
                          const weight =
                            next === 'lbs' ? set.weight / 0.45359237 : set.weight * 0.45359237;
                          setSets(
                            sets.map((s, n) =>
                              n === i
                                ? { ...s, unit: next, weight: Math.round(weight * 100) / 100 }
                                : s,
                            ),
                          );
                          setDirty(true);
                        }}
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        aria-label={`${exercise.name} set ${i + 1} reps`}
                        min={0}
                        max={200}
                        value={set.reps}
                        disabled={exercise.completed}
                        onChange={(e) => update(i, 'reps', +e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Set ${i + 1} completed`}
                        checked={set.completed}
                        disabled={exercise.completed}
                        onChange={(e) => update(i, 'completed', e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="set-footer">
            <span>
              {sets.filter((s) => s.completed).length}/{sets.length} sets · {Math.round(volume)} kg
              volume
            </span>
            <button
              className="text-link"
              onClick={() =>
                restUntil ? setRestUntil(null) : setRestUntil(Date.now() + exercise.rest * 1000)
              }
            >
              <Timer size={16} />
              {restUntil ? `${seconds}s · Stop timer` : `${exercise.rest}s rest timer`}
            </button>
          </div>
          <div className="exercise-actions">
            {!exercise.completed && (
              <Button variant="secondary" busy={busy} onClick={save}>
                Save sets{dirty ? ' •' : ''}
              </Button>
            )}
            <Button variant={exercise.completed ? 'ghost' : ''} busy={busy} onClick={complete}>
              {exercise.completed ? <Undo2 size={17} /> : <Check size={17} />}
              {exercise.completed ? 'Undo completion' : 'Mark as completed'}
            </Button>
          </div>
        </div>
      )}
      {history && <PerformanceHistory exercise={exercise} onClose={() => setHistory(false)} />}
      {demo && <ExerciseDemo exercise={exercise} onClose={() => setDemo(false)} />}
    </article>
  );
}
export function Workouts() {
  const { state: s, refresh, mutate, busy, toast } = useApp();
  const [split, setSplit] = useState<'select' | 'edit' | null>(null),
    [tab, setTab] = useState('today'),
    [duration, setDuration] = useState(false),
    [record, setRecord] = useState<any>(null),
    [generate, setGenerate] = useState(false);
  if (!s) return null;
  const plan = s.plan,
    completed = plan?.exercises.filter((e: any) => e.completed) || [],
    pending = plan?.exercises.filter((e: any) => !e.completed) || [],
    monday = addDays(s.date, -weekday(s.date));
  const metrics = recordMetrics(s.setLogs);
  const unit = s.settings.weightUnit,
    factor = unit === 'lbs' ? 1 / 0.45359237 : 1;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUILT ONE REP AT A TIME</span>
          <h1>Your training ground.</h1>
          <p>A plan with purpose. Progress you can see.</p>
        </div>
        <DatePicker
          date={s.date}
          today={s.today}
          onChange={(d) => refresh(d).catch((e) => toast(errorMessage(e), true))}
        />
      </div>
      <div className="workout-toolbar">
        <Button variant="secondary" onClick={() => setSplit('select')}>
          <Layers size={18} />
          Select workout split
        </Button>
        <Button variant="secondary" onClick={() => setSplit('edit')}>
          <SlidersHorizontal size={18} />
          Edit workout split
        </Button>
        <span className="muted">{s.splits.at(-1)?.name}</span>
      </div>
      <div className="week-strip">
        {days.map((day, i) => {
          const date = addDays(monday, i),
            schedule = s.splits.filter((sp) => sp.effective <= date).at(-1)?.days[i];
          return (
            <button
              key={day}
              disabled={date > s.today || date < s.profile.startDate}
              className={date === s.date ? 'active' : ''}
              onClick={() => refresh(date).catch((e) => toast(errorMessage(e), true))}
            >
              <span>{day.slice(0, 3)}</span>
              <strong>{+date.slice(8)}</strong>
              <small>{schedule?.rest ? 'Recovery' : schedule?.muscles[0] || '—'}</small>
            </button>
          );
        })}
      </div>
      <div className="content-tabs">
        <div role="tablist" aria-label="Workout sections">
          {[
            { key: 'today', label: 'Workout' },
            { key: 'history', label: 'Workout history' },
            { key: 'records', label: 'Personal records' },
          ].map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'today' ? (
        <>
          {!plan || plan.rest ? (
            <section className="card rest-card">
              <Empty
                icon={Leaf}
                title={plan ? 'Recovery is part of the plan.' : 'Your journey hadn’t started yet.'}
                description={
                  plan
                    ? 'A little rest goes a long way. Take a gentle walk, refuel and come back ready. Your streak is protected on scheduled rest days.'
                    : 'Choose a date on or after your first check-in to see a workout.'
                }
              >
                <Button variant="secondary" onClick={() => setSplit('edit')}>
                  View weekly schedule
                </Button>
              </Empty>
            </section>
          ) : (
            <>
              <section className="card workout-session-header">
                <div>
                  <span className="eyebrow">
                    {s.date === s.today ? 'TODAY’S SESSION' : s.date} ·{' '}
                    {plan.source === 'AI' ? 'AI-GENERATED, SAVED PLAN' : 'YOUR SAVED PLAN'}
                  </span>
                  <h2>{plan.muscles.join(' + ')}</h2>
                  <p>
                    {completed.length}/{plan.exercises.length} exercises completed · {metrics.sets}{' '}
                    completed sets · {Math.round(metrics.volume * factor)} {unit} volume
                  </p>
                  <Progress value={completed.length} target={plan.exercises.length} />
                </div>
                <div className="session-actions">
                  <Button variant="secondary" onClick={() => setDuration(true)}>
                    <Timer size={17} />
                    {plan.duration ? `${plan.duration} min recorded` : 'Log duration'}
                  </Button>
                  <button className="text-link" onClick={() => setGenerate(true)}>
                    <Sparkles size={16} />
                    Personalize with AI
                  </button>
                </div>
              </section>
              <SectionTitle title={`Pending exercises · ${pending.length}`} />
              {pending.length ? (
                pending.map((e: any, i: number) => (
                  <ExerciseCard key={`${plan._id}-${e.id}`} exercise={e} index={i} />
                ))
              ) : (
                <div className="session-finished">
                  <Check size={22} />
                  <span>You showed up. All exercises completed.</span>
                </div>
              )}
              {completed.length > 0 && (
                <>
                  <SectionTitle title={`Completed exercises · ${completed.length}`} />
                  {completed.map((e: any, i: number) => (
                    <ExerciseCard key={`${plan._id}-${e.id}`} exercise={e} index={i} />
                  ))}
                </>
              )}
              <p className="hint">
                Enter 0 kg for bodyweight movements. Rest when needed and prioritize controlled
                form. Workouts count toward your streak only after you explicitly complete an
                exercise.
              </p>
            </>
          )}
        </>
      ) : tab === 'history' ? (
        <section className="card">
          <SectionTitle title="Proof of your consistency" />
          <div className="history-list">
            {s.histories.length ? (
              s.histories.map((h) => (
                <button
                  key={h._id}
                  onClick={() => {
                    refresh(h.date)
                      .then(() => setTab('today'))
                      .catch((e) => toast(errorMessage(e), true));
                  }}
                >
                  <span className="history-date">
                    <strong>{+h.date.slice(8)}</strong>
                    <small>
                      {new Date(h.date + 'T12:00:00Z').toLocaleDateString('en', {
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </small>
                  </span>
                  <span>
                    <strong>{h.muscles.join(' + ')}</strong>
                    <small>
                      {h.completedExercises.length} exercises completed · {h.sets} sets ·{' '}
                      {h.duration} min
                    </small>
                    <small>
                      {h.completedExercises.join(', ') ||
                        'Sets recorded; no exercises confirmed yet'}
                    </small>
                  </span>
                  <span className="history-volume">
                    {Math.round(h.volume * factor)} {unit}
                    <small>{h.percentage}% complete</small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))
            ) : (
              <Empty
                icon={History}
                title="Your training story starts here"
                description="Saved workouts and performance records will appear here."
              />
            )}
          </div>
        </section>
      ) : (
        <section className="card">
          <SectionTitle title="Stronger than yesterday" eyebrow="PERSONAL RECORDS" />
          {s.records.length ? (
            <div className="pr-grid">
              {s.records.map((r) => (
                <button
                  className="pr-card"
                  key={r._id}
                  onClick={() => setRecord({ id: r.exerciseId, name: r.name })}
                >
                  <Trophy size={25} />
                  <h3>{r.name}</h3>
                  <strong>
                    {(r.weight * factor).toFixed(1)} <small>{unit}</small>
                  </strong>
                  <p>
                    {r.reps} max reps · {(r.oneRepMax * factor).toFixed(1)} {unit} est. 1RM
                  </p>
                  <span>{r.achievedAt} · View history →</span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              icon={Trophy}
              title="Your next personal best is waiting"
              description="Complete your sets, then confirm the exercise. We’ll keep track of your records."
            />
          )}
        </section>
      )}
      {split && <SplitEditor select={split === 'select'} onClose={() => setSplit(null)} />}
      {duration && <QuickLog kind="duration" onClose={() => setDuration(false)} />}
      {record && <PerformanceHistory exercise={record} onClose={() => setRecord(null)} />}
      {generate && (
        <Modal title="Personalize this routine with AI?" onClose={() => setGenerate(false)}>
          <p className="muted">
            This replaces today’s unstarted routine using your goals, equipment, experience,
            recovery notes and previous sets. Your profile and recent performance are sent to the
            configured AI provider. Recorded workouts are preserved.
          </p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setGenerate(false)}>
              Cancel
            </Button>
            <Button
              busy={busy}
              onClick={() =>
                mutate(
                  'post',
                  `/workouts/${plan?._id}/generate`,
                  {},
                  'Your personalized routine is saved',
                )
                  .then(() => setGenerate(false))
                  .catch(() => {})
              }
            >
              <Sparkles size={17} />
              Generate routine
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

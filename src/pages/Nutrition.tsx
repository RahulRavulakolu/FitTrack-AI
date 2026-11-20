import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Camera,
  ScanLine,
  Plus,
  Utensils,
  Trash2,
  Pencil,
  Bookmark,
  Sparkles,
  Wallet,
  ArrowRight,
  Check,
  Flame,
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
import { MediaPicker } from '../components/MediaPicker';
import { QuickLog } from '../components/QuickLog';
import { SmartImage } from '../components/SmartImage';
import { TrendChart } from '../components/Charts';
import { foodSchema, type FoodInput } from '../../shared/domain';
const meals = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner', 'Other'];
export const newFood = (date: string): FoodInput => ({
  name: '',
  quantity: 1,
  unit: 'serving',
  meal: 'Breakfast',
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
  source: 'manual',
  imageUrl: '',
  date,
});
export function FoodEditor({
  initial,
  onClose,
  editId,
  estimated = false,
  note = '',
}: {
  initial: FoodInput[];
  onClose: () => void;
  editId?: string;
  estimated?: boolean;
  note?: string;
}) {
  const { state: s, mutate, busy, toast } = useApp();
  const [items, setItems] = useState(initial),
    [favorite, setFavorite] = useState(false),
    [requestId] = useState(() => crypto.randomUUID());
  function update(i: number, key: string, value: any) {
    setItems(
      items.map((item, n) => {
        if (n !== i) return item;
        if (key === 'quantity') {
          if (value <= 0) return { ...item, quantity: value };
          const ratio = item.quantity > 0 ? value / item.quantity : 1;
          return {
            ...item,
            quantity: value,
            ...Object.fromEntries(
              ['calories', 'protein', 'carbs', 'fats', 'fiber'].map((k) => [
                k,
                Math.round((item as any)[k] * ratio * 10) / 10,
              ]),
            ),
          };
        }
        return { ...item, [key]: value };
      }),
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsed = items.map((item) => foodSchema.parse(item));
      if (favorite && parsed.length === 1) await api.post('/favorites', parsed[0]);
      await mutate(
        editId ? 'put' : 'post',
        editId ? `/foods/${editId}` : '/foods',
        editId ? parsed[0] : { items: parsed, requestId },
        editId ? 'Food entry updated' : 'Food logged. Your daily totals are up to date.',
      );
      onClose();
    } catch (e) {
      if (!('response' in Object(e))) toast(errorMessage(e), true);
    }
  }
  return (
    <Modal
      title={
        editId ? 'Edit food entry' : estimated ? 'Review your food estimates' : 'Log your food'
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={save}>
        {estimated && (
          <div className="info-banner">
            <Sparkles size={20} />
            <p>
              <strong>Estimates, ready for your review.</strong>
              <br />
              {note ||
                'A photo cannot reveal exact portions, ingredients or cooking methods. Correct each item before confirming.'}
            </p>
          </div>
        )}
        <p className="hint">
          Nutrition values below are for the entire quantity shown. Changing quantity scales the
          values proportionally.
        </p>
        {items.map((item, i) => (
          <div className="food-edit-item" key={i}>
            <div className="food-edit-heading">
              <strong>Food {i + 1}</strong>
              {items.length > 1 && (
                <button
                  type="button"
                  className="icon-btn danger-text"
                  aria-label={`Remove food ${i + 1}`}
                  onClick={() => setItems(items.filter((_, n) => n !== i))}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
            <div className="form-grid">
              <Field
                label="Food name"
                required
                maxLength={150}
                placeholder="e.g. Paneer rice bowl"
                value={item.name}
                onChange={(e) => update(i, 'name', e.target.value)}
              />
              <Select
                label="Meal"
                value={item.meal}
                options={meals}
                onChange={(e) => update(i, 'meal', e.target.value)}
              />
              <Field
                label="Quantity"
                type="number"
                required
                min="0.01"
                max={100000}
                step="0.01"
                value={item.quantity || ''}
                onChange={(e) => update(i, 'quantity', +e.target.value)}
              />
              <Field
                label="Serving unit"
                required
                maxLength={30}
                placeholder="g, bowl, serving…"
                value={item.unit}
                onChange={(e) => update(i, 'unit', e.target.value)}
              />
            </div>
            <div className="nutrition-fields">
              {(['calories', 'protein', 'carbs', 'fats', 'fiber'] as const).map((k) => (
                <Field
                  key={k}
                  label={`${k[0].toUpperCase() + k.slice(1)} (${k === 'calories' ? 'kcal' : 'g'})`}
                  type="number"
                  required
                  min={0}
                  max={k === 'calories' ? 10000 : k === 'carbs' ? 2000 : k === 'fiber' ? 500 : 1000}
                  step="0.1"
                  value={item[k]}
                  onChange={(e) => update(i, k, +e.target.value)}
                />
              ))}
            </div>
          </div>
        ))}
        {!editId && (
          <button
            type="button"
            className="text-link"
            onClick={() => setItems([...items, newFood(s!.date)])}
            disabled={items.length >= 20}
          >
            <Plus size={16} />
            Add another food
          </button>
        )}
        {items.length === 1 && !editId && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
            />
            Save to my frequent foods
          </label>
        )}
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit">
            <Check size={17} />
            {estimated ? 'Confirm estimates & save' : 'Save food'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Nutrition() {
  const { state: s, refresh, mutate, busy, toast } = useApp(),
    [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState<{
      items: FoodInput[];
      id?: string;
      estimated?: boolean;
      note?: string;
    } | null>(null),
    [camera, setCamera] = useState(false),
    [expense, setExpense] = useState(false),
    [tab, setTab] = useState(params.has('report') ? 'report' : 'diary'),
    [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    if (params.has('log') && s) {
      setEditor({ items: [newFood(s.date)] });
      setParams({}, { replace: true });
    }
  }, []);
  if (!s) return null;
  async function analyze(file: File) {
    const data = new FormData();
    data.append('image', file);
    const result = await api.post('/foods/analyze', data);
    if (!result.data.items.length) {
      toast(result.data.note || 'No food was detected. Try a clearer photo.', true);
      return;
    }
    setEditor({
      items: result.data.items.map((f: any) => ({
        ...f,
        meal: 'Lunch',
        source: 'AI',
        date: s!.date,
        imageUrl: result.data.imageUrl,
      })),
      estimated: true,
      note: result.data.note,
    });
  }
  const weekly = s.reports.slice(-7),
    logged = weekly.filter((d) => d.logged).length;
  const avg = (key: string) => Math.round(weekly.reduce((a, d) => a + d[key], 0) / 7);
  const calorieDays = weekly.filter(
    (d) =>
      d.logged &&
      Math.abs(d.calories - s.profile.targets.calories) <= s.profile.targets.calories * 0.1,
  ).length;
  const proteinDays = weekly.filter((d) => d.protein >= s.profile.targets.protein).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EAT WELL. FEEL GOOD.</span>
          <h1>Nutrition</h1>
          <p>Fuel your body. Find your balance.</p>
        </div>
        <DatePicker
          date={s.date}
          today={s.today}
          onChange={(d) => refresh(d).catch((e) => toast(errorMessage(e), true))}
        />
      </div>
      <div className="nutrition-summary">
        {[
          { key: 'calories', label: 'Calories', color: 'var(--lime)', unit: 'kcal' },
          { key: 'protein', label: 'Protein', color: 'var(--lavender)', unit: 'g' },
          { key: 'carbs', label: 'Carbs', color: 'var(--amber)', unit: 'g' },
          { key: 'fats', label: 'Fats', color: 'var(--blue)', unit: 'g' },
        ].map((m) => (
          <div className="card compact" key={m.key}>
            <div className="stat-label">
              <span>
                <i className="dot" style={{ background: m.color }} />
                {m.label}
              </span>
              <span>{m.unit}</span>
            </div>
            <div className="macro-total">
              <strong>{Math.round(s.totals[m.key])}</strong>
              <span>/ {s.profile.targets[m.key as keyof typeof s.profile.targets]}</span>
            </div>
            <Progress
              value={s.totals[m.key]}
              target={s.profile.targets[m.key as keyof typeof s.profile.targets]}
              color={m.color}
            />
          </div>
        ))}
      </div>
      <section className="scanner-banner">
        <div className="scanner-symbol">
          <ScanLine size={44} strokeWidth={1.3} />
          <span>AI</span>
        </div>
        <div>
          <span className="eyebrow">LESS TYPING. MORE LIVING.</span>
          <h2>Snap it. Review it. Log it.</h2>
          <p>Turn a meal photo into editable nutrition estimates.</p>
        </div>
        <Button onClick={() => setCamera(true)}>
          <Camera size={18} />
          Scan a meal
        </Button>
      </section>
      <div className="content-tabs">
        <div role="tablist" aria-label="Nutrition sections">
          {[
            { key: 'diary', label: 'Food diary' },
            { key: 'report', label: 'Weekly report' },
            { key: 'budget', label: 'Food budget' },
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
        <Button variant="secondary" onClick={() => setEditor({ items: [newFood(s.date)] })}>
          <Plus size={17} />
          Enter food manually
        </Button>
      </div>
      {tab === 'diary' ? (
        <div className="nutrition-layout">
          <section className="card">
            <SectionTitle
              title={s.date === s.today ? 'Today’s food diary' : 'Your food diary'}
              eyebrow={new Date(s.date + 'T12:00:00Z').toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            />
            {!s.foods.length ? (
              <Empty
                icon={Utensils}
                title="Your next good choice starts here"
                description="Log a meal manually or scan a photo. Every entry helps you understand your day."
              >
                <Button variant="secondary" onClick={() => setEditor({ items: [newFood(s.date)] })}>
                  <Plus size={17} />
                  Log your first food
                </Button>
              </Empty>
            ) : (
              meals.map((meal) => {
                const rows = s.foods.filter((f) => f.meal === meal);
                return rows.length ? (
                  <div className="meal-section" key={meal}>
                    <div className="meal-heading">
                      <h3>{meal}</h3>
                      <span>{Math.round(rows.reduce((a, f) => a + f.calories, 0))} kcal</span>
                    </div>
                    {rows.map((f) => (
                      <div className="food-row" key={f._id}>
                        <div className="food-thumbnail">
                          {f.imageUrl ? (
                            <SmartImage src={f.imageUrl} alt={f.name} />
                          ) : (
                            <Utensils size={22} />
                          )}
                        </div>
                        <div className="food-description">
                          <strong>{f.name}</strong>
                          <small>
                            {f.quantity} {f.unit} ·{' '}
                            {new Date(f.createdAt).toLocaleTimeString('en', {
                              hour: 'numeric',
                              minute: '2-digit',
                              timeZone: s.profile.timezone,
                            })}
                            {f.source === 'AI' ? ' · AI estimate' : ''}
                          </small>
                          <div className="food-macros">
                            <span>P {f.protein}g</span>
                            <span>C {f.carbs}g</span>
                            <span>F {f.fats}g</span>
                          </div>
                        </div>
                        <strong className="food-calories">
                          {Math.round(f.calories)}
                          <small>kcal</small>
                        </strong>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            aria-label={`Save ${f.name} to frequent foods`}
                            disabled={busy}
                            onClick={() =>
                              mutate('post', '/favorites', f, 'Saved to frequent foods').catch(
                                () => {},
                              )
                            }
                          >
                            <Bookmark size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Edit ${f.name}`}
                            onClick={() => setEditor({ items: [f], id: f._id })}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn danger-text"
                            aria-label={`Delete ${f.name}`}
                            onClick={() => setDeleting(f._id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })
            )}
          </section>
          <aside className="card frequent-foods">
            <SectionTitle title="Your go-to foods">
              <Bookmark size={19} />
            </SectionTitle>
            <p className="hint">Save the things you love. Log them again in a tap.</p>
            {s.favorites.length ? (
              s.favorites.map((f) => (
                <div className="favorite-row" key={f._id}>
                  <button onClick={() => setEditor({ items: [{ ...f.data, date: s.date }] })}>
                    <strong>{f.name}</strong>
                    <small>
                      {f.data.calories} kcal · {f.data.quantity} {f.data.unit}
                    </small>
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Remove favorite ${f.name}`}
                    disabled={busy}
                    onClick={() =>
                      mutate('delete', `/favorites/${f._id}`, {}, 'Favorite removed').catch(
                        () => {},
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                icon={Bookmark}
                title="A place for your favorites"
                description="Select “Save to my frequent foods” when logging a meal."
              />
            )}
            <div className="tip-box">
              <Sparkles size={20} />
              <strong>A note on food photos</strong>
              <p>
                AI can estimate what’s on your plate. You know your portions best. Always review
                before saving.
              </p>
              <small>
                {s.services.ai
                  ? 'Free AI · processed on your FitTrack server'
                  : s.services.aiMessage || 'The AI service is unavailable. Try again shortly.'}
              </small>
            </div>
          </aside>
        </div>
      ) : tab === 'report' ? (
        <section className="card">
          <SectionTitle title="Your week in perspective" eyebrow="LAST 7 DAYS, INCLUDING TODAY" />
          <div className="activity-grid">
            <Stat label="Daily average" value={avg('calories')} unit="kcal" />
            <Stat label="Average protein" value={avg('protein')} unit="g" />
            <Stat label="Average carbs" value={avg('carbs')} unit="g" />
            <Stat label="Average fats" value={avg('fats')} unit="g" />
          </div>
          <TrendChart
            data={weekly}
            dataKey="calories"
            bars
            unit="kcal"
            target={s.profile.targets.calories}
            height={260}
          />
          <div className="report-summary">
            <span>
              <strong>{logged}/7</strong> days with food logs
            </span>
            <span>
              <strong>{calorieDays}/7</strong> within 10% of calorie target
            </span>
            <span>
              <strong>{proteinDays}/7</strong> reached protein target
            </span>
          </div>
          <p className="hint">
            Averages use all seven calendar days; unlogged days contribute zero recorded intake.
            Comparisons use your current targets.
          </p>
        </section>
      ) : (
        <section className="card">
          <SectionTitle title="Good nutrition, within reach" eyebrow="YOUR FOOD BUDGET">
            <Button variant="secondary" onClick={() => setExpense(true)}>
              <Plus size={17} />
              Add expense
            </Button>
          </SectionTitle>
          <div className="activity-grid">
            <Stat label="Today" value={`₹${s.budget.day.toLocaleString()}`} />
            <Stat label="Last 7 days" value={`₹${s.budget.week.toLocaleString()}`} />
            <Stat label="This month" value={`₹${s.budget.month.toLocaleString()}`} />
            <Stat
              label={`${s.profile.budgetPeriod} remaining`}
              value={`₹${Math.round(s.budget.remaining).toLocaleString()}`}
              detail={`Budget: ₹${s.profile.budget.toLocaleString()}`}
            />
          </div>
          <Progress value={s.budget.spent} target={s.profile.budget} />
          <p className="hint">
            Daily budgets reset each day, weekly budgets cover the last seven days, and monthly
            budgets follow calendar months.
          </p>
          {s.expenses.length ? (
            <div className="expense-list">
              {s.expenses.map((e) => (
                <div key={e._id}>
                  <span className="log-symbol">
                    <Wallet size={18} />
                  </span>
                  <p>
                    <strong>{e.description}</strong>
                    <small>
                      {e.date} · {e.category}
                    </small>
                  </p>
                  <strong>₹{e.amount.toLocaleString()}</strong>
                  <button
                    className="icon-btn"
                    aria-label={`Delete expense ${e.description}`}
                    disabled={busy}
                    onClick={() =>
                      mutate('delete', `/expenses/${e._id}`, {}, 'Expense removed').catch(() => {})
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Wallet}
              title="A fresh budget for the month"
              description="Record groceries, meals out or other food expenses."
            />
          )}
        </section>
      )}
      {camera && <MediaPicker onClose={() => setCamera(false)} onConfirm={analyze} />}
      {editor && (
        <FoodEditor
          key={editor.id || JSON.stringify(editor.items)}
          initial={editor.items}
          editId={editor.id}
          estimated={editor.estimated}
          note={editor.note}
          onClose={() => setEditor(null)}
        />
      )}
      {expense && <QuickLog kind="expense" onClose={() => setExpense(false)} />}
      {deleting && (
        <Modal title="Delete this food entry?" onClose={() => setDeleting(null)}>
          <p className="muted">Your daily nutrition totals will be updated.</p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              busy={busy}
              onClick={() =>
                mutate('delete', `/foods/${deleting}`, {}, 'Food entry deleted')
                  .then(() => setDeleting(null))
                  .catch(() => {})
              }
            >
              Delete entry
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

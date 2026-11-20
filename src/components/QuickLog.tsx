import { useState } from 'react';
import { useApp } from '../lib/app';
import { Button, Field, Modal, Select } from './ui';
export function QuickLog({
  kind,
  onClose,
}: {
  kind: 'activity' | 'weight' | 'expense' | 'duration';
  onClose: () => void;
}) {
  const { state: s, mutate, busy } = useApp();
  const [requestId] = useState(() => crypto.randomUUID()),
    [date, setDate] = useState(s!.date),
    [values, setValues] = useState<any>(
      kind === 'activity'
        ? s!.activity || { steps: 0, distance: 0, minutes: 0, calories: 0 }
        : kind === 'weight'
          ? { weight: s!.profile.weight }
          : kind === 'expense'
            ? { description: '', amount: '', category: 'Groceries' }
            : { duration: s!.plan?.duration || 0 },
    );
  const set = (key: string, v: any) => setValues({ ...values, [key]: v });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutate(
        kind === 'expense' ? 'post' : 'put',
        kind === 'duration'
          ? `/workouts/${s!.plan._id}/duration`
          : `/${kind === 'expense' ? 'expenses' : kind}`,
        kind === 'duration'
          ? { duration: +values.duration }
          : kind === 'activity'
            ? {
                date,
                steps: +values.steps,
                distance: +values.distance,
                minutes: +values.minutes,
                calories: +values.calories,
              }
            : kind === 'weight'
              ? { date, weight: +values.weight }
              : {
                  date,
                  description: values.description,
                  amount: +values.amount,
                  category: values.category,
                  requestId,
                },
      );
      onClose();
    } catch {}
  }
  return (
    <Modal
      title={
        kind === 'activity'
          ? 'Log your daily activity'
          : kind === 'weight'
            ? 'A new check-in'
            : kind === 'expense'
              ? 'Add a food expense'
              : 'Record workout duration'
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {kind !== 'duration' && (
          <Field
            label="Date"
            type="date"
            required
            max={s!.today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        {kind === 'activity' ? (
          <>
            <p className="hint">
              {s!.activity?.stepsSource === 'health_connect'
                ? 'Steps come from Health Connect. You can update the other activity totals here.'
                : 'Enter totals for this day. Saving replaces the previous daily activity totals.'}
            </p>
            <div className="form-grid">
              {[
                { k: 'steps', l: 'Steps walked', m: 150000 },
                { k: 'distance', l: 'Walking distance (km)', m: 200 },
                { k: 'minutes', l: 'Active minutes', m: 1440 },
                { k: 'calories', l: 'Estimated calories burned', m: 15000 },
              ].map((f) => (
                <Field
                  key={f.k}
                  label={f.l}
                  type="number"
                  required
                  min={0}
                  max={f.m}
                  step={f.k === 'distance' ? '0.01' : '1'}
                  value={values[f.k]}
                  readOnly={f.k === 'steps' && s!.activity?.stepsSource === 'health_connect'}
                  onChange={(e) => set(f.k, +e.target.value)}
                />
              ))}
            </div>
          </>
        ) : kind === 'weight' ? (
          <>
            <Field
              label="Body weight (kg)"
              type="number"
              required
              min={30}
              max={350}
              step="0.1"
              value={values.weight}
              onChange={(e) => set('weight', +e.target.value)}
            />
            <p className="hint">
              {s!.profile.customTargets
                ? 'Your custom nutrition targets will be preserved.'
                : 'Recommended nutrition targets will update with your latest weight.'}
            </p>
          </>
        ) : kind === 'expense' ? (
          <>
            <Field
              label="What did you buy?"
              required
              maxLength={150}
              placeholder="e.g. Weekly groceries"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
            />
            <Field
              label="Amount (₹)"
              type="number"
              required
              min="0.01"
              max={1000000}
              step="0.01"
              value={values.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
            <Select
              label="Category"
              value={values.category}
              onChange={(e) => set('category', e.target.value)}
              options={['Groceries', 'Eating out', 'Supplements', 'Other']}
            />
          </>
        ) : (
          <Field
            label="Workout duration (minutes)"
            type="number"
            min={0}
            max={600}
            required
            value={values.duration}
            onChange={(e) => set('duration', +e.target.value)}
          />
        )}
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Save {kind === 'weight' ? 'check-in' : kind}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

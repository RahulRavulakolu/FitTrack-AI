import { useEffect, useRef, type ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, LoaderCircle, Dumbbell, ArrowUpRight } from 'lucide-react';
import { addDays } from '../../shared/domain';
import { SmartImage } from './SmartImage';
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Dumbbell size={22} />
      </span>
      <span>
        fittrack<span className="brand-ai">AI</span>
      </span>
    </div>
  );
}
export function Button({
  children,
  busy = false,
  variant = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`btn ${variant} ${props.className || ''}`}
    >
      {busy ? <LoaderCircle size={18} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  children?: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>
        {options.map((o) => (
          <option
            key={typeof o === 'string' ? o : o.value}
            value={typeof o === 'string' ? o : o.value}
          >
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    const close = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener('cancel', close);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      el.close();
      el.removeEventListener('cancel', close);
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? 'wide' : ''}`}
      ref={dialog}
      aria-label={title}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Progress({
  value,
  target,
  color = 'var(--lime)',
}: {
  value: number;
  target: number;
  color?: string;
}) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.max(target, value)}
    >
      <div
        style={{
          width: `${Math.min(100, (value / Math.max(1, target)) * 100)}%`,
          background: color,
        }}
      />
    </div>
  );
}
export function Ring({
  value,
  target,
  size = 150,
  children,
  color = 'var(--lime)',
}: {
  value: number;
  target: number;
  size?: number;
  children?: ReactNode;
  color?: string;
}) {
  const radius = 44,
    c = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--track)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value / Math.max(1, target)))}
        />
      </svg>
      <div>{children}</div>
    </div>
  );
}
export function Avatar({
  user,
  size = 42,
}: {
  user: { name: string; photoUrl?: string };
  size?: number;
}) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size / 3 }}>
      {user.photoUrl ? (
        <SmartImage src={user.photoUrl} alt={`${user.name}'s profile`} />
      ) : (
        user.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((x) => x[0])
          .join('')
          .toUpperCase()
      )}
    </span>
  );
}
export function Empty({
  icon: Icon = Dumbbell,
  title,
  description,
  children,
}: {
  icon?: any;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function DatePicker({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (d: string) => void;
}) {
  return (
    <div className="date-picker">
      <button
        className="icon-btn"
        aria-label="Previous day"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft size={18} />
      </button>
      <input
        type="date"
        aria-label="Record date"
        value={date}
        max={today}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <button
        className="icon-btn"
        disabled={date >= today}
        aria-label="Next day"
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
export function Stat({
  label,
  value,
  unit,
  icon: Icon,
  detail,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: any;
  detail?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        {Icon && <Icon size={17} />}
      </div>
      <div className="stat-value">
        {value}
        <span>{unit}</span>
      </div>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <Brand />
      <LoaderCircle className="spin" />
      <p>Getting everything ready…</p>
    </div>
  );
}

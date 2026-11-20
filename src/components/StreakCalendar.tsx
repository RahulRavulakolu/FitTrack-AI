import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dateRange, weekday, daySchedule } from '../../shared/domain';
import { useApp } from '../lib/app';
export function StreakCalendar() {
  const { state: s } = useApp();
  const [month, setMonth] = useState(s!.today.slice(0, 7));
  const first = month + '-01';
  const end = addDays(
    new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 1)).toISOString().slice(0, 10),
    -1,
  );
  function shift(n: number) {
    const d = new Date(first + 'T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <div className="calendar">
      <div className="calendar-header">
        <strong>
          {new Date(first + 'T12:00:00Z').toLocaleDateString('en', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </strong>
        <span>
          <button className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-btn"
            aria-label="Next month"
            disabled={month >= s!.today.slice(0, 7)}
            onClick={() => shift(1)}
          >
            <ChevronRight size={16} />
          </button>
        </span>
      </div>
      <div className="calendar-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <small key={i}>{d}</small>
        ))}
        {Array.from({ length: weekday(first) }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {dateRange(first, end).map((date) => {
          const record = s!.streak.calendar.find((d: any) => d.date === date);
          const status =
            date > s!.today || date < s!.profile.startDate
              ? 'future'
              : record?.status || (daySchedule(date, s!.splits).rest ? 'rest' : 'pending');
          return (
            <span
              key={date}
              title={`${date}: ${status}`}
              aria-label={`${date}: ${status}`}
              className={`${status} ${date === s!.today ? 'today' : ''}`}
            >
              {+date.slice(8)}
            </span>
          );
        })}
      </div>
      <div className="calendar-key">
        <span>
          <i className="completed" />
          Trained
        </span>
        <span>
          <i className="rest" />
          Rest
        </span>
        <span>
          <i className="missed" />
          Missed
        </span>
      </div>
    </div>
  );
}

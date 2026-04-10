import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveWorkout, useWorkouts } from '../../api/hooks/useWorkouts.js';
import { useTrainingStats, usePersonalRecords } from '../../api/hooks/useAnalytics.js';
import { useSchedule } from '../../api/hooks/useSchedule.js';
import { formatVolume } from '../../utils/format.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import WeeklyHeatMap from '../../features/muscle-map/WeeklyHeatMap.jsx';
import './dashboard.css';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_NAMES_FULL = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
  'Четверг', 'Пятница', 'Суббота',
];
const MONTH_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const PR_TYPE_LABELS = { weight: 'Вес', volume: 'Объём', estimated_1rm: '1RM' };

function getMonday(date) {
  const d = new Date(date);
  const jsDay = d.getDay();
  const diff = (jsDay === 0 ? -6 : 1) - jsDay;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(monday) {
  const sun = new Date(monday);
  sun.setDate(sun.getDate() + 6);
  const mDay = monday.getDate();
  const sDay = sun.getDate();
  const mMonth = MONTH_GENITIVE[monday.getMonth()];
  const sMonth = MONTH_GENITIVE[sun.getMonth()];
  if (monday.getMonth() === sun.getMonth()) {
    return `${mDay}–${sDay} ${mMonth}`;
  }
  return `${mDay} ${mMonth} – ${sDay} ${sMonth}`;
}

function elapsedSince(startedAt) {
  if (!startedAt) return '';
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 60) return `${totalMin} мин`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const todayMonday = getMonday(now);
  const currentMonday = useMemo(() => {
    const m = new Date(todayMonday);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const todayDayOfWeek = DAY_NAMES_FULL[now.getDay()];
  const todayDate = `${now.getDate()} ${MONTH_GENITIVE[now.getMonth()]}`;
  const scheduleIndex = (now.getDay() + 6) % 7;

  const { data: activeWorkout } = useActiveWorkout();
  const { data: stats } = useTrainingStats();
  const { data: prs } = usePersonalRecords();
  const { data: schedule } = useSchedule();
  const { data: completedWorkouts } = useWorkouts({ status: 'completed', limit: 100 });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      const isToday = isSameDay(d, now);
      const hasDone = (completedWorkouts || []).some((w) => {
        const wd = new Date(w.finished_at || w.started_at);
        return isSameDay(wd, d);
      });
      days.push({ date: d, dayNum: d.getDate(), isToday, hasDone });
    }
    return days;
  }, [currentMonday, completedWorkouts]);

  const todayTemplates = useMemo(() => {
    if (!schedule) return [];
    const dayEntry = schedule.find((s) => s.day_of_week === scheduleIndex);
    return dayEntry?.templates || [];
  }, [schedule, scheduleIndex]);

  const recentPRs = useMemo(() => {
    if (!prs) return [];
    const flat = [];
    for (const group of prs) {
      for (const rec of (group.records || [])) {
        flat.push({ exercise: group.exercise_name, ...rec });
      }
    }
    flat.sort((a, b) => new Date(b.achieved_at) - new Date(a.achieved_at));
    return flat.slice(0, 5);
  }, [prs]);

  return (
    <div className="dashboard">
      {/* Greeting */}
      <div className="dash-greeting">
        <div className="dash-greeting__date">{todayDayOfWeek}, {todayDate}</div>
        <h1 className="dash-greeting__title">Главная</h1>
      </div>

      {/* Active workout banner */}
      {activeWorkout && (
        <div className="dash-active">
          <div className="dash-active__info">
            <span className="dash-active__name">
              {activeWorkout.template_name || 'Тренировка'}
            </span>
            <span className="dash-active__time">
              ⏱ {elapsedSince(activeWorkout.started_at)}
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/workout/active')}>
            Продолжить
          </Button>
        </div>
      )}

      {/* Week strip */}
      <div className="dash-week">
        <div className="dash-week__header">
          <div className="dash-week__nav">
            <button className="dash-week__arrow" onClick={() => setWeekOffset((o) => o - 1)}>
              ←
            </button>
            <span className="dash-week__label">{formatWeekLabel(currentMonday)}</span>
            <button
              className="dash-week__arrow"
              onClick={() => setWeekOffset((o) => o + 1)}
              disabled={weekOffset >= 0}
            >
              →
            </button>
          </div>
        </div>
        <div className="dash-week__days">
          {weekDays.map((d, i) => (
            <div
              key={i}
              className={
                'dash-day' +
                (d.isToday ? ' dash-day--today' : '') +
                (d.hasDone ? ' dash-day--done' : '')
              }
            >
              <span className="dash-day__label">{DAY_LABELS[i]}</span>
              <span className="dash-day__circle">
                {d.hasDone ? '✓' : d.dayNum}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's schedule */}
      <div className="dash-schedule">
        <h2 className="dash-schedule__title">Сегодня</h2>
        {todayTemplates.length > 0 ? (
          todayTemplates.map((t) => (
            <div key={t.id} className="dash-schedule__item">
              <span className="dash-schedule__name">{t.name}</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/workout/active', { state: { templateId: t.id } })}
              >
                Начать
              </Button>
            </div>
          ))
        ) : (
          <Card>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 12 }}>
              Нет запланированной тренировки
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/workout/active')}>
              Свободная тренировка
            </Button>
          </Card>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="dash-stats">
          <div className="dash-stat">
            <span className="dash-stat__icon">🔥</span>
            <span className="dash-stat__value">{stats.current_streak}</span>
            <span className="dash-stat__label">дней подряд</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat__icon">📅</span>
            <span className="dash-stat__value">{stats.workouts_this_month}</span>
            <span className="dash-stat__label">тренировок за месяц</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat__icon">🏋️</span>
            <span className="dash-stat__value">
              {stats.total_volume_this_month ? formatVolume(stats.total_volume_this_month) : '0 кг'}
            </span>
            <span className="dash-stat__label">объём за месяц</span>
          </div>
        </div>
      )}

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div className="dash-prs">
          <h2 className="dash-prs__title">Рекорды</h2>
          <Card>
            {recentPRs.map((pr, i) => {
              const d = new Date(pr.achieved_at);
              const dateStr = `${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]}`;
              return (
                <div key={i} className="dash-pr">
                  <div className="dash-pr__info">
                    <span className="dash-pr__exercise">{pr.exercise}</span>
                    <span className="dash-pr__type">
                      {PR_TYPE_LABELS[pr.record_type] || pr.record_type} · {dateStr}
                    </span>
                  </div>
                  <span className="dash-pr__value">{pr.value} кг</span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* Muscle heat map */}
      <WeeklyHeatMap />
    </div>
  );
}

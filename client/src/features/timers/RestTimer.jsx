import { useEffect, useRef } from 'react';
import { useWorkoutStore } from '../../stores/workoutStore.js';
import { useTimer } from './useTimer.js';
import { playBeep } from './sounds.js';
import './timers.css';

const PROGRESS_RADIUS = 20;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

export default function RestTimer() {
  const isTimerRunning = useWorkoutStore((s) => s.isTimerRunning);
  const timerSeconds = useWorkoutStore((s) => s.timerSeconds);
  const stopTimer = useWorkoutStore((s) => s.stopTimer);
  const timer = useTimer();
  const totalRef = useRef(0);
  const beeped = useRef(false);
  const autoDismiss = useRef(null);

  // Start countdown when store triggers
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      totalRef.current = timerSeconds;
      beeped.current = false;
      timer.start(timerSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning, timerSeconds]);

  // Beep at zero + auto-dismiss after 3s
  useEffect(() => {
    if (timer.seconds === 0 && !timer.isRunning && totalRef.current > 0 && !beeped.current) {
      beeped.current = true;
      playBeep();
      autoDismiss.current = setTimeout(() => {
        stopTimer();
        timer.reset();
        totalRef.current = 0;
      }, 3000);
    }
    return () => {
      if (autoDismiss.current) clearTimeout(autoDismiss.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.seconds, timer.isRunning]);

  const handleDismiss = () => {
    if (autoDismiss.current) clearTimeout(autoDismiss.current);
    timer.reset();
    stopTimer();
    totalRef.current = 0;
  };

  const handlePause = () => {
    if (timer.isRunning) {
      timer.pause();
    } else {
      timer.resume();
    }
  };

  const handleAdd = (delta) => {
    timer.addTime(delta);
    totalRef.current = Math.max(1, totalRef.current + delta);
  };

  // Nothing to show
  if (!isTimerRunning && totalRef.current === 0) return null;
  // Already dismissed
  if (timer.seconds === 0 && !timer.isRunning && beeped.current && !autoDismiss.current) return null;

  const m = Math.floor(timer.seconds / 60);
  const s = timer.seconds % 60;
  const progress = totalRef.current > 0 ? timer.seconds / totalRef.current : 0;
  const dashOffset = PROGRESS_CIRCUMFERENCE * (1 - progress);
  const finished = timer.seconds === 0 && !timer.isRunning;

  return (
    <div className={`rest-timer-float${finished ? ' rest-timer-float--done' : ''}`}>
      <div className="rest-timer-float__ring">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle
            cx="26"
            cy="26"
            r={PROGRESS_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="4"
          />
          <circle
            cx="26"
            cy="26"
            r={PROGRESS_RADIUS}
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={PROGRESS_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 26 26)"
            className="rest-timer-float__progress"
          />
        </svg>
        <span className="rest-timer-float__time">
          {m}:{String(s).padStart(2, '0')}
        </span>
      </div>

      <span className="rest-timer-float__label">
        {finished ? 'Готово!' : 'Отдых'}
      </span>

      <div className="rest-timer-float__actions">
        <button
          className="rest-timer-float__btn"
          onClick={() => handleAdd(-30)}
          aria-label="Минус 30 секунд"
          disabled={finished}
        >
          −30с
        </button>
        <button
          className="rest-timer-float__btn"
          onClick={handlePause}
          aria-label={timer.isRunning ? 'Пауза' : 'Продолжить'}
          disabled={finished}
        >
          {timer.isRunning ? '⏸' : '▶'}
        </button>
        <button
          className="rest-timer-float__btn"
          onClick={() => handleAdd(30)}
          aria-label="Плюс 30 секунд"
          disabled={finished}
        >
          +30с
        </button>
        <button
          className="rest-timer-float__btn rest-timer-float__btn--close"
          onClick={handleDismiss}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

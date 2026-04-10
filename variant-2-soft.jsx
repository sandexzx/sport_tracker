import { useState } from "react";

const MOCK_EXERCISES = [
  {
    id: 1,
    name: "Жим гантелей лёжа",
    emoji: "🏋️",
    sets: [
      { weight: 20, reps: 12, done: true },
      { weight: 22, reps: 10, done: true },
      { weight: 24, reps: 8, done: false },
    ],
  },
  {
    id: 2,
    name: "Приседания",
    emoji: "🦵",
    sets: [
      { weight: 40, reps: 15, done: true },
      { weight: 50, reps: 12, done: false },
      { weight: 50, reps: 10, done: false },
    ],
  },
  {
    id: 3,
    name: "Тяга гантели в наклоне",
    emoji: "💪",
    sets: [
      { weight: 18, reps: 12, done: true },
      { weight: 20, reps: 10, done: true },
      { weight: 22, reps: 8, done: false },
    ],
  },
  {
    id: 4,
    name: "Отжимания",
    emoji: "🫳",
    sets: [
      { weight: 0, reps: 20, done: true },
      { weight: 0, reps: 18, done: false },
      { weight: 0, reps: 15, done: false },
    ],
  },
];

const WEEK = [
  { day: "Пн", done: true },
  { day: "Вт", done: false },
  { day: "Ср", done: true },
  { day: "Чт", done: false },
  { day: "Пт", done: true },
  { day: "Сб", done: false },
  { day: "Вс", done: false },
];

export default function SoftTracker() {
  const [exercises, setExercises] = useState(MOCK_EXERCISES);
  const [expandedId, setExpandedId] = useState(1);

  const toggleSet = (exId, setIdx) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIdx ? { ...s, done: !s.done } : s
              ),
            }
          : ex
      )
    );
  };

  const totalSets = exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const doneSets = exercises.reduce(
    (s, ex) => s + ex.sets.filter((set) => set.done).length,
    0
  );

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #faf6f1;
      --surface: #ffffff;
      --cream: #f0e9df;
      --terra: #c4704b;
      --terra-light: #e8a888;
      --terra-bg: #fdf0e9;
      --olive: #7a8a6e;
      --olive-bg: #eef2eb;
      --text: #2c2420;
      --text2: #9a8e84;
      --shadow: 0 1px 3px rgba(44,36,32,0.06), 0 6px 16px rgba(44,36,32,0.04);
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      min-height: 100vh;
    }

    .app {
      max-width: 480px;
      margin: 0 auto;
      padding: 0 16px 40px;
      min-height: 100vh;
    }

    /* === HEADER === */
    .header {
      padding: 28px 0 20px;
    }

    .greeting {
      font-size: 14px;
      color: var(--text2);
      margin-bottom: 4px;
    }

    .title {
      font-family: 'DM Serif Display', serif;
      font-size: 32px;
      color: var(--text);
      line-height: 1.1;
    }

    /* === WEEK STRIP === */
    .week {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .week-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .week-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text2);
    }

    .week-dot {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--cream);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .week-dot.active {
      background: var(--olive);
      box-shadow: 0 2px 8px rgba(122,138,110,0.3);
    }

    .week-dot.active::after {
      content: '✓';
      color: #fff;
      font-size: 14px;
      font-weight: 600;
    }

    .week-dot.today {
      border: 2px solid var(--terra);
    }

    /* === PROGRESS CARD === */
    .progress-card {
      background: var(--surface);
      border-radius: 20px;
      padding: 24px;
      box-shadow: var(--shadow);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .progress-bar-bg {
      flex: 1;
      height: 12px;
      background: var(--cream);
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--terra), var(--terra-light));
      border-radius: 6px;
      transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .progress-text {
      font-weight: 600;
      font-size: 15px;
      white-space: nowrap;
      color: var(--terra);
    }

    .progress-label {
      font-size: 12px;
      color: var(--text2);
      margin-top: 2px;
    }

    .progress-info {
      text-align: right;
      flex-shrink: 0;
    }

    /* === EXERCISE CARDS === */
    .exercise-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ex-card {
      background: var(--surface);
      border-radius: 16px;
      box-shadow: var(--shadow);
      overflow: hidden;
      animation: fadeUp 0.35s ease both;
    }

    .ex-card:nth-child(1) { animation-delay: 0.04s; }
    .ex-card:nth-child(2) { animation-delay: 0.08s; }
    .ex-card:nth-child(3) { animation-delay: 0.12s; }
    .ex-card:nth-child(4) { animation-delay: 0.16s; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ex-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .ex-header:hover {
      background: rgba(0,0,0,0.015);
    }

    .ex-emoji {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--terra-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .ex-info {
      flex: 1;
      min-width: 0;
    }

    .ex-name {
      font-weight: 600;
      font-size: 15px;
      line-height: 1.2;
    }

    .ex-sub {
      font-size: 12px;
      color: var(--text2);
      margin-top: 2px;
    }

    .ex-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      flex-shrink: 0;
    }

    .ex-badge.partial {
      background: var(--terra-bg);
      color: var(--terra);
    }

    .ex-badge.complete {
      background: var(--olive-bg);
      color: var(--olive);
    }

    /* === SETS === */
    .sets-area {
      padding: 0 18px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .set-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--bg);
      cursor: pointer;
      transition: all 0.15s;
      border: 1.5px solid transparent;
    }

    .set-pill:hover {
      border-color: var(--cream);
    }

    .set-pill.done {
      background: var(--olive-bg);
      border-color: rgba(122,138,110,0.2);
    }

    .set-pill-num {
      font-size: 12px;
      font-weight: 600;
      color: var(--text2);
      width: 18px;
    }

    .set-pill.done .set-pill-num {
      color: var(--olive);
    }

    .set-pill-detail {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }

    .set-pill-detail span {
      color: var(--text2);
      font-weight: 400;
    }

    .set-pill-check {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--cream);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      transition: all 0.2s;
    }

    .set-pill.done .set-pill-check {
      background: var(--olive);
      border-color: var(--olive);
      color: #fff;
    }

    @media (min-width: 768px) {
      .app {
        max-width: 520px;
        padding: 0 24px 40px;
      }
    }
  `;

  const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="greeting">Четверг, 10 апреля</div>
          <div className="title">Твоя тренировка</div>
        </div>

        <div className="week">
          {WEEK.map((d, i) => (
            <div key={i} className="week-day">
              <span className="week-label">{d.day}</span>
              <div
                className={`week-dot ${d.done ? "active" : ""} ${
                  i === 4 ? "today" : ""
                }`}
              />
            </div>
          ))}
        </div>

        <div className="progress-card">
          <div style={{ flex: 1 }}>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="progress-info">
            <div className="progress-text">
              {doneSets} из {totalSets}
            </div>
            <div className="progress-label">подходов</div>
          </div>
        </div>

        <div className="exercise-list">
          {exercises.map((ex) => {
            const exDone = ex.sets.filter((s) => s.done).length;
            const allDone = exDone === ex.sets.length;
            const isExpanded = expandedId === ex.id;
            return (
              <div key={ex.id} className="ex-card">
                <div
                  className="ex-header"
                  onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                >
                  <div className="ex-emoji">{ex.emoji}</div>
                  <div className="ex-info">
                    <div className="ex-name">{ex.name}</div>
                    <div className="ex-sub">
                      {ex.sets.length} подходов · {exDone} выполнено
                    </div>
                  </div>
                  <div className={`ex-badge ${allDone ? "complete" : "partial"}`}>
                    {allDone ? "✓" : `${exDone}/${ex.sets.length}`}
                  </div>
                </div>
                {isExpanded && (
                  <div className="sets-area">
                    {ex.sets.map((set, i) => (
                      <div
                        key={i}
                        className={`set-pill ${set.done ? "done" : ""}`}
                        onClick={() => toggleSet(ex.id, i)}
                      >
                        <span className="set-pill-num">{i + 1}</span>
                        <span className="set-pill-detail">
                          {set.weight > 0 ? (
                            <>
                              {set.weight} кг <span>× {set.reps}</span>
                            </>
                          ) : (
                            <>
                              {set.reps} <span>повторений</span>
                            </>
                          )}
                        </span>
                        <div className="set-pill-check">
                          {set.done && "✓"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useExercises } from '../../api/hooks/useExercises.js';
import { useExerciseProgress } from '../../api/hooks/useAnalytics.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import './charts.css';

const PERIODS = [
  { key: '30d', label: '30д' },
  { key: '90d', label: '90д' },
  { key: '1y', label: '1 год' },
  { key: 'all', label: 'Всё' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{formatDate(label)}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: entry.color }} />
          <span>{entry.name}: {Math.round(entry.value)}кг</span>
        </div>
      ))}
    </div>
  );
}

export default function ExerciseChart() {
  const [exerciseId, setExerciseId] = useState('');
  const [period, setPeriod] = useState('90d');
  const { data: exercises = [] } = useExercises();
  const { data: progress = [], isLoading } = useExerciseProgress(exerciseId, period);

  const chartData = progress.map((p) => ({
    ...p,
    dateLabel: formatDate(p.date),
  }));

  return (
    <div className="exercise-chart">
      <select
        className="exercise-chart__select"
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
      >
        <option value="">Выберите упражнение</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.emoji ? `${ex.emoji} ` : ''}{ex.name}
          </option>
        ))}
      </select>

      <div className="exercise-chart__periods">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`exercise-chart__period-btn${period === p.key ? ' exercise-chart__period-btn--active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!exerciseId ? (
        <EmptyState icon="📊" title="Выберите упражнение" description="Выберите упражнение для просмотра прогресса" />
      ) : isLoading ? (
        <EmptyState icon="⏳" title="Загрузка..." />
      ) : chartData.length === 0 ? (
        <EmptyState icon="📭" title="Нет данных" description="По этому упражнению пока нет записей за выбранный период" />
      ) : (
        <div className="exercise-chart__wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} stroke="#9a8e84" />
              <YAxis yAxisId="left" fontSize={12} stroke="#9a8e84" />
              <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#9a8e84" hide />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 12, color: '#2c2420' }}>{value}</span>}
              />
              <Bar
                yAxisId="right"
                dataKey="total_volume"
                name="Объём"
                fill="#f0e9df"
                fillOpacity={0.7}
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="max_weight"
                name="Вес"
                stroke="#c4704b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#c4704b' }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="estimated_1rm"
                name="1RM"
                stroke="#7a8a6e"
                strokeWidth={2}
                dot={{ r: 3, fill: '#7a8a6e' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

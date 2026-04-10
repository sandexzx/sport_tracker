import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useBodyAnalytics } from '../../api/hooks/useAnalytics.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import './charts.css';

const METRICS = [
  { key: 'weight', label: 'Вес (кг)', color: '#c4704b', axis: 'left' },
  { key: 'chest', label: 'Грудь (см)', color: '#7a8a6e', axis: 'right' },
  { key: 'waist', label: 'Талия (см)', color: '#c49a4b', axis: 'right' },
  { key: 'bicep', label: 'Бицепс (см)', color: '#4b8ac4', axis: 'right' },
  { key: 'thighs', label: 'Бёдра (см)', color: '#8a6e7a', axis: 'right' },
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
          <span>{entry.name}: {entry.value != null ? entry.value : '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function BodyChart() {
  const [visible, setVisible] = useState(() => new Set(['weight']));
  const { data: bodyData = [], isLoading } = useBodyAnalytics();

  const toggle = (key) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) return <EmptyState icon="⏳" title="Загрузка..." />;
  if (bodyData.length === 0) return <EmptyState icon="📏" title="Нет замеров" description="Добавьте замеры тела для отображения графика" />;

  return (
    <div className="body-chart">
      <h3 className="chart-section-title">Динамика замеров</h3>

      <div className="body-chart__toggles">
        {METRICS.map((m) => (
          <label
            key={m.key}
            className={`body-chart__toggle${visible.has(m.key) ? ' body-chart__toggle--active' : ''}`}
          >
            <input
              type="checkbox"
              checked={visible.has(m.key)}
              onChange={() => toggle(m.key)}
            />
            <span className="body-chart__swatch" style={{ background: m.color }} />
            {m.label}
          </label>
        ))}
      </div>

      <div className="body-chart__wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={bodyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} stroke="#9a8e84" />
            <YAxis yAxisId="left" fontSize={12} stroke="#9a8e84" label={{ value: 'кг', position: 'insideTopLeft', fontSize: 11, fill: '#9a8e84' }} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#9a8e84" label={{ value: 'см', position: 'insideTopRight', fontSize: 11, fill: '#9a8e84' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span style={{ fontSize: 12, color: '#2c2420' }}>{value}</span>}
            />
            {METRICS.map((m) =>
              visible.has(m.key) ? (
                <Line
                  key={m.key}
                  yAxisId={m.axis}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: m.color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

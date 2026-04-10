import { useState, useCallback } from 'react';
import { useMuscleLoad } from '../../api/hooks/useAnalytics.js';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import MuscleBody from './MuscleBody.jsx';
import { buildHeatHighlights, getHeatColor } from './muscle-mapping.js';
import './muscle-map.css';

const LEGEND_STEPS = 6;

function Legend() {
  const stops = Array.from({ length: LEGEND_STEPS }, (_, i) => {
    const load = (i / (LEGEND_STEPS - 1)) * 20;
    return getHeatColor(load, 20);
  });

  return (
    <div className="heatmap-legend">
      <span className="heatmap-legend__label">0</span>
      <div className="heatmap-legend__bar">
        {stops.map((color, i) => (
          <div
            key={i}
            className="heatmap-legend__segment"
            style={{ background: color }}
          />
        ))}
      </div>
      <span className="heatmap-legend__label">20+ подходов</span>
    </div>
  );
}

function Tooltip({ muscle, load, onClose }) {
  if (!muscle) return null;

  return (
    <div className="heatmap-tooltip" onClick={onClose} role="status">
      <strong>{muscle}</strong>
      <span>{load ?? 0} подходов за неделю</span>
    </div>
  );
}

export default function WeeklyHeatMap() {
  const { data, isLoading } = useMuscleLoad();
  const [selected, setSelected] = useState(null);

  const highlights = buildHeatHighlights(data);

  const handleClick = useCallback(
    (muscle) => {
      const entry = data?.find((d) => d.muscle_name === muscle);
      setSelected({ muscle, load: entry?.total_load ?? 0 });
    },
    [data],
  );

  const closeTooltip = useCallback(() => setSelected(null), []);

  if (isLoading) {
    return (
      <Card className="heatmap-card">
        <p className="heatmap-loading">Загрузка...</p>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="heatmap-card">
        <EmptyState
          icon="🏋️"
          title="Нет данных"
          description="Завершите тренировку, чтобы увидеть тепловую карту мышц"
        />
      </Card>
    );
  }

  return (
    <Card className="heatmap-card">
      <h3 className="heatmap-title">Нагрузка за неделю</h3>

      <div className="heatmap-bodies">
        <MuscleBody view="front" highlights={highlights} onClick={handleClick} />
        <MuscleBody view="back" highlights={highlights} onClick={handleClick} />
      </div>

      <Legend />

      {selected && (
        <Tooltip
          muscle={selected.muscle}
          load={selected.load}
          onClose={closeTooltip}
        />
      )}
    </Card>
  );
}

import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import CheckpointList from '../../features/body/CheckpointList.jsx';
import PhotoGallery from '../../features/body/PhotoGallery.jsx';
import WeeklyHeatMap from '../../features/muscle-map/WeeklyHeatMap.jsx';
import ExerciseChart from '../../features/charts/ExerciseChart.jsx';
import PersonalRecords from '../../features/charts/PersonalRecords.jsx';
import BodyChart from '../../features/charts/BodyChart.jsx';
import '../../features/body/body.css';

const TABS = [
  { key: 'muscles', label: 'Мышцы' },
  { key: 'exercises', label: 'Упражнения' },
  { key: 'body', label: 'Замеры тела' },
  { key: 'photos', label: 'Фото' },
];

export default function Progress() {
  const [tab, setTab] = useState('exercises');

  return (
    <div>
      <PageHeader title="Прогресс" />

      <div className="progress-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`progress-tabs__tab ${tab === t.key ? 'progress-tabs__tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'muscles' && <WeeklyHeatMap />}
      {tab === 'exercises' && (
        <>
          <ExerciseChart />
          <PersonalRecords />
        </>
      )}
      {tab === 'body' && (
        <>
          <BodyChart />
          <CheckpointList />
        </>
      )}
      {tab === 'photos' && <PhotoGallery />}
    </div>
  );
}

import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ExerciseList from '../../features/exercises/ExerciseList.jsx';
import TemplateList from '../../features/templates/TemplateList.jsx';
import ScheduleView from '../../features/schedule/ScheduleView.jsx';
import './workout-tabs.css';

const TABS = [
  { key: 'templates', label: 'Шаблоны' },
  { key: 'exercises', label: 'Упражнения' },
  { key: 'schedule', label: 'Расписание' },
];

const TITLES = {
  templates: 'Шаблоны',
  exercises: 'Упражнения',
  schedule: 'Расписание',
};

export default function Workout() {
  const [tab, setTab] = useState('templates');

  return (
    <div>
      <PageHeader title={TITLES[tab]} />
      <div className="workout-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`workout-tabs__btn${tab === t.key ? ' workout-tabs__btn--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'templates' && <TemplateList />}
      {tab === 'exercises' && <ExerciseList />}
      {tab === 'schedule' && <ScheduleView />}
    </div>
  );
}

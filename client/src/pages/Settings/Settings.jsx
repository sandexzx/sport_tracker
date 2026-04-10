import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { useExportData } from '../../api/hooks/useExport.js';
import './Settings.css';

const NAV_ITEMS = [
  { label: 'Упражнения', desc: 'Каталог упражнений', to: '/workout' },
  { label: 'Шаблоны тренировок', desc: 'Создание и редактирование шаблонов', to: '/workout' },
  { label: 'Расписание', desc: 'Настройка расписания тренировок', to: '/workout' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { exportData, isExporting } = useExportData();

  return (
    <div className="settings">
      <PageHeader title="Настройки" />

      <section className="settings__section">
        <h2 className="settings__subtitle">Данные</h2>
        <Card>
          <p className="settings__desc">Скачать все данные в формате JSON</p>
          <Button
            className="settings__export-btn"
            disabled={isExporting}
            onClick={exportData}
          >
            {isExporting ? (
              <>
                <span className="settings__spinner" aria-hidden="true" />
                Экспорт…
              </>
            ) : (
              'Экспорт данных'
            )}
          </Button>
        </Card>
      </section>

      <section className="settings__section">
        <h2 className="settings__subtitle">Управление</h2>
        <div className="settings__nav-list">
          {NAV_ITEMS.map((item) => (
            <Card
              key={item.label}
              className="settings__link-card"
              onClick={() => navigate(item.to)}
            >
              <div className="settings__link-content">
                <span className="settings__link-label">{item.label}</span>
                <span className="settings__link-desc">{item.desc}</span>
              </div>
              <span className="settings__link-arrow" aria-hidden="true">→</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="settings__section">
        <h2 className="settings__subtitle">О приложении</h2>
        <Card className="settings__about">
          <span className="settings__about-icon" aria-hidden="true">🏋️</span>
          <span className="settings__about-name">Sport Tracker</span>
          <span className="settings__about-version">v1.0.0</span>
          <p className="settings__about-desc">
            Трекер силовых тренировок для персонального использования
          </p>
        </Card>
      </section>
    </div>
  );
}

import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', icon: '🏠', label: 'Главная' },
  { to: '/workout', icon: '💪', label: 'Тренировка' },
  { to: '/history', icon: '📋', label: 'История' },
  { to: '/progress', icon: '📊', label: 'Прогресс' },
  { to: '/settings', icon: '⚙️', label: 'Настройки' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

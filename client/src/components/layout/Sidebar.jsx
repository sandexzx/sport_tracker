import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', icon: '🏠', label: 'Главная' },
  { to: '/workout', icon: '💪', label: 'Тренировка' },
  { to: '/history', icon: '📋', label: 'История' },
  { to: '/progress', icon: '📊', label: 'Прогресс' },
  { to: '/settings', icon: '⚙️', label: 'Настройки' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && <span className="sidebar__title">Sport Tracker</span>}
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      <nav className="sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{link.icon}</span>
            {!collapsed && <span className="sidebar__label">{link.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

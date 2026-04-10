import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import Sidebar from './Sidebar.jsx';
import './layout.css';

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

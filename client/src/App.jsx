import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Workout from './pages/Workout/Workout.jsx';
import History from './pages/History/History.jsx';
import WorkoutDetail from './features/history/WorkoutDetail.jsx';
import Progress from './pages/Progress/Progress.jsx';
import Settings from './pages/Settings/Settings.jsx';
import ActiveWorkout from './features/active-workout/ActiveWorkout.jsx';

function Wrap({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Wrap><Dashboard /></Wrap>} />
          <Route path="workout" element={<Wrap><Workout /></Wrap>} />
          <Route path="workout/active" element={<Wrap><ActiveWorkout /></Wrap>} />
          <Route path="history" element={<Wrap><History /></Wrap>} />
          <Route path="history/:workoutId" element={<Wrap><WorkoutDetail /></Wrap>} />
          <Route path="progress" element={<Wrap><Progress /></Wrap>} />
          <Route path="settings" element={<Wrap><Settings /></Wrap>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import LoginForm from './components/LoginForm';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './context/AuthContext';
import { Analytics } from '@vercel/analytics/react';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      {isAuthenticated ? <DashboardPage /> : <LoginForm />}
      <Analytics />
    </div>
  );
}

export default App;

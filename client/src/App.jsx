import LoginForm from './components/LoginForm';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();

  return <div className="app-shell">{isAuthenticated ? <DashboardPage /> : <LoginForm />}</div>;
}

export default App;

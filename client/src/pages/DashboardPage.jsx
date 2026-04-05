import { useEffect, useMemo, useState } from 'react';
import { getCurrentSession } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import WorkerHomeTab from '../components/WorkerHomeTab';
import WorkerTasksTab from '../components/WorkerTasksTab';
import WorkerMetricsTab from '../components/WorkerMetricsTab';
import SupervisorHomeTab from '../components/SupervisorHomeTab';
import SupervisorTasksTab from '../components/SupervisorTasksTab';
import SupervisorMetricsTab from '../components/SupervisorMetricsTab';

function DashboardPage() {
  const { token, user, logout } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('home');

  const isSupervisor = user?.role === 'SUPERVISOR';

  useEffect(() => {
    async function loadCurrentSession() {
      try {
        const current = await getCurrentSession(token);
        setActiveSession(current);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadCurrentSession();
  }, [token]);

  useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
  }, []);

  async function installApp() {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  const tabComponent = useMemo(() => {
    if (isSupervisor) {
      if (activeTab === 'tasks') {
        return <SupervisorTasksTab token={token} />;
      }

      if (activeTab === 'metrics') {
        return <SupervisorMetricsTab token={token} />;
      }

      return <SupervisorHomeTab token={token} />;
    }

    if (activeTab === 'tasks') {
      return <WorkerTasksTab token={token} activeSession={activeSession} />;
    }

    if (activeTab === 'metrics') {
      return <WorkerMetricsTab token={token} />;
    }

    return (
      <WorkerHomeTab
        token={token}
        activeSession={activeSession}
        onSessionChange={setActiveSession}
      />
    );
  }, [activeSession, activeTab, isSupervisor, token]);

  return (
    <main className={`dashboard-shell tab-${activeTab}`}>
      <header className="topbar fade-in">
        <div>
          <p className="eyebrow">SITE OPS</p>
          <h1>
            {activeTab === 'home' && (isSupervisor ? 'Panel de Supervisión' : 'Control de Jornada')}
            {activeTab === 'tasks' && (isSupervisor ? 'Monitoreo de Tareas' : 'Tareas de Obra')}
            {activeTab === 'metrics' && 'Métricas de Rendimiento'}
          </h1>
          <p>
            {user?.name} | {user?.role} ({user?.employeeId})
          </p>
        </div>

        <div className="topbar-actions">
          {deferredPrompt ? (
            <button type="button" className="secondary-button" onClick={installApp}>
              Instalar App
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={logout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {error ? <p className="feedback error">{error}</p> : null}

      <section className="dashboard-content" key={`${user?.role}-${activeTab}`}>
        {tabComponent}
      </section>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </main>
  );
}

export default DashboardPage;

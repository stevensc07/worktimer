function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onChange('home')}
      >
        HOME
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
        onClick={() => onChange('tasks')}
      >
        TASKS
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'metrics' ? 'active' : ''}`}
        onClick={() => onChange('metrics')}
      >
        METRICS
      </button>
    </nav>
  );
}

export default BottomNav;

function BottomNav({ activeTab, onChange }) {
  const items = [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'tasks', label: 'Tareas', icon: '🧱' },
    { id: 'metrics', label: 'Reporte', icon: '📊' }
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
          aria-current={activeTab === item.id ? 'page' : undefined}
        >
          <span aria-hidden>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;

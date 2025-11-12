import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AppHeader from '../AppHeader';
import AppSidebar from '../AppSidebar';
import styles from './styles.module.css';

const MainLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Проверяем авторизацию
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <AppSidebar onNavigate={handleCloseSidebar} />
      </aside>

      {sidebarOpen && <div className={styles.overlay} onClick={handleCloseSidebar} />}

      <div className={styles.main}>
        <header className={styles.header}>
          <AppHeader onToggleSidebar={handleToggleSidebar} showMenuTrigger />
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;


import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { isAuthenticated } from '../utils/auth';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Если не авторизован, перенаправляем на страницу авторизации
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }

  // Показываем загрузку, пока получаем данные пользователя
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" tip="Проверка доступа..." />
      </div>
    );
  }

  // Если пользователь не админ, перенаправляем на главную
  if (user?.role !== 'USER_ROLE_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Если пользователь — админ, рендерим дочерние компоненты
  return <>{children}</>;
};

export default AdminRoute;


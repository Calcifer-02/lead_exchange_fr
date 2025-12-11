import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  if (!isAuthenticated()) {
    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    return <Navigate to="/auth" replace />;
  }

  // Если пользователь авторизован, рендерим дочерние компоненты
  return <>{children}</>;
};

export default ProtectedRoute;


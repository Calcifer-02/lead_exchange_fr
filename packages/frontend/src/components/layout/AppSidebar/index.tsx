import { memo, useState, useEffect } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreFilled,
  ContactsOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FundProjectionScreenOutlined,
  UserAddOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userAPI } from '../../../api';
import type { UserRole } from '../../../types/user';
import styles from './styles.module.css';

type MenuItem = Required<MenuProps>['items'][number];

interface SidebarProps {
  onNavigate?: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: '/dashboard', label: 'Дашборд', icon: <AppstoreFilled /> },
  { key: '/my-objects', label: 'Мои лиды', icon: <DatabaseOutlined /> },
  { key: '/leads/new', label: 'Создать лид', icon: <UserAddOutlined /> },
  { key: '/leads-catalog', label: 'Каталог лидов', icon: <FundProjectionScreenOutlined /> },
  { key: '/deals', label: 'Сделки', icon: <ContactsOutlined /> },
  { key: '/finance', label: 'Финансы', icon: <DollarOutlined /> },
  { key: '/admin', label: 'Администрирование', icon: <SettingOutlined />, adminOnly: true },
];

const AppSidebarComponent = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const profile = await userAPI.getProfile();
        setUserRole(profile.role);
      } catch {
        // Если не удалось загрузить профиль, не показываем админ-меню
        setUserRole(null);
      }
    };
    loadUserRole();
  }, []);

  const isAdmin = userRole === 'USER_ROLE_ADMIN';

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const mapMenuItems = (): MenuItem[] =>
    filteredNavItems.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    }));

  const selectedKey =
    filteredNavItems.find(
      (item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`)
    )?.key || '/dashboard';

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key && key !== location.pathname) {
      navigate(key);
    }
    onNavigate?.();
  };

  return (
    <div className={styles.sidebar}>
      <Link to="/dashboard" className={styles.brand} onClick={onNavigate}>
        <div className={styles.brandIcon}>
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAdVBMVEUAe/sAd/oAb/VypfPe6vkAYs8AdPH////o7PAAVbro8PoDX7/v8fIAb+cAUKNYcZkAWtRnbHV/jKEcW6pVaIh6h5oAZeaBodNhd50AaNwAb/eEr/F4e38ALXUAb+IAHmEAZc4AefbD1e8AUsLJ0NsAT7NKZIyk4XqWAAAAa0lEQVR4AdTMMRZAMBRE0QgSAACQELD/JfL7TKH02ntm2G9zODbuer5AO1fKIATKI4lVxAlpbNc0I80LBrWsIh9s66bFz10v34bRZtNMtiiNbd3MN3OQUXzHxsxxAqPEdSsyoKM2zwZ3igMARnwIErfWw3EAAAAASUVORK5CYII=" alt="Lead Exchange" />
        </div>
        <div className={styles.brandTitle}>
          Lead Exchange
          <span className={styles.brandSubtitle}>Биржа лидов</span>
        </div>
      </Link>
      <div className={styles.menu}>
        <Menu selectedKeys={[selectedKey]} mode="inline" items={mapMenuItems()} onClick={handleClick} />
      </div>
    </div>
  );
};

const AppSidebar = memo(AppSidebarComponent);

export default AppSidebar;


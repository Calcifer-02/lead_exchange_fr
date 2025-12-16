import { memo, useState, useEffect } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreFilled,
  ContactsOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FundProjectionScreenOutlined,
  HomeOutlined,
  ShopOutlined,
  UserAddOutlined,
  SettingOutlined,
  ThunderboltOutlined,
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
  highlighted?: boolean;
}

const navItems: NavItem[] = [
  { key: '/dashboard', label: 'Дашборд', icon: <AppstoreFilled /> },
  { key: '/my-objects', label: 'Мои объекты', icon: <DatabaseOutlined /> },
  { key: '/leads/new', label: 'Новый лид', icon: <UserAddOutlined /> },
  { key: '/properties/new', label: 'Новый объект', icon: <HomeOutlined /> },
  { key: '/leads-catalog', label: 'Каталог лидов', icon: <FundProjectionScreenOutlined /> },
  { key: '/properties-catalog', label: 'Каталог объектов', icon: <ShopOutlined /> },
  { key: '/matching', label: 'AI-Матчинг', icon: <ThunderboltOutlined />, highlighted: true },
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
      className: item.highlighted ? styles.highlightedMenuItem : undefined,
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
          <img src="/logo.svg" alt="Lead Exchange" />
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


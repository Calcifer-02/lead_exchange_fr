import { memo } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreFilled,
  ContactsOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

type MenuItem = Required<MenuProps>['items'][number];

interface SidebarProps {
  onNavigate?: () => void;
}

const navItems: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: '/dashboard', label: 'Дашборд', icon: <AppstoreFilled /> },
  { key: '/my-objects', label: 'Мои объекты', icon: <DatabaseOutlined /> },
  { key: '/leads-catalog', label: 'Каталог лидов', icon: <FundProjectionScreenOutlined /> },
  { key: '/deals', label: 'Сделки', icon: <ContactsOutlined /> },
  { key: '/finance', label: 'Финансы', icon: <DollarOutlined /> },
];

const mapMenuItems = (): MenuItem[] =>
  navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

const AppSidebarComponent = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey =
    navItems.find(
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


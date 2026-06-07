import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, BarChart2, Scale } from 'lucide-react';
import styles from './Shell.module.css';

const nav = [
  { to: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions',  label: 'Transactions', icon: ArrowLeftRight   },
  { to: '/categories',    label: 'Categories',   icon: Tag              },
  { to: '/analytics',     label: 'Analytics',    icon: BarChart2        },
  { to: '/debt',          label: 'Debt',         icon: Scale            },
];

export default function Shell() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Spender</div>
        <nav className={styles.nav}>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

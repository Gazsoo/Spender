import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, BarChart2, Scale, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const nav = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight  },
  { to: '/categories',   label: 'Categories',   icon: Tag             },
  { to: '/analytics',    label: 'Analytics',    icon: BarChart2       },
  { to: '/debt',         label: 'Debt',         icon: Scale           },
  { to: '/home',         label: 'Home',         icon: Home            },
];

export default function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <header className="h-14 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-6">
        <span className="font-display font-black text-xl tracking-tight text-gray-900">
          Spender
        </span>

        <nav className="flex items-center gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:block">Log out</span>
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

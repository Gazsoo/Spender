import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, BarChart2, Scale, Home, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const nav = [
  { to: '/home',         label: 'Home',         icon: Home            },
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight  },
  { to: '/categories',   label: 'Categories',   icon: Tag             },
  { to: '/analytics',    label: 'Analytics',    icon: BarChart2       },
  { to: '/debt',         label: 'Debt',         icon: Scale           },
];

const linkCls = (isActive: boolean) =>
  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
    isActive
      ? 'bg-amber-50 text-amber-700'
      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <header className="h-14 bg-white border-b border-gray-200 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
        <span className="font-display font-black text-xl tracking-tight text-gray-900">
          Spender
        </span>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => linkCls(isActive)}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop user + logout */}
        {user && (
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="md:hidden flex items-center justify-center w-9 h-9 -mr-1 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-14 z-10 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="md:hidden fixed top-14 inset-x-0 z-20 bg-white border-b border-gray-200 shadow-sm flex flex-col p-3 gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => linkCls(isActive)}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
            {user && (
              <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100 px-3">
                <span className="text-sm text-gray-500">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            )}
          </nav>
        </>
      )}

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutGrid, ReceiptText, Package, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/dashboard/orders', label: 'Orders', icon: ReceiptText },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-ink text-cream">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-hairline bg-ink lg:w-56">
        <Link to="/" className="font-display flex h-16 items-center justify-center border-b border-hairline text-lg font-semibold tracking-tight lg:justify-start lg:px-6">
          <span className="hidden lg:inline">xorai<span className="text-lime">.</span></span>
          <span className="text-lime lg:hidden">x.</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 p-2 lg:p-3" aria-label="Dashboard">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors lg:justify-start ${
                  isActive
                    ? 'bg-panel font-medium text-lime'
                    : 'text-fog hover:bg-panel/60 hover:text-cream'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline p-2 lg:p-3">
          <div className="flex items-center justify-center gap-3 rounded-xl px-3 py-2 lg:justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime font-display text-sm font-bold text-ink">
              {user?.name?.[0] ?? '?'}
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-ash">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fog transition-colors hover:bg-panel/60 hover:text-cream lg:justify-start"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-16 min-w-0 flex-1 lg:ml-56">
        <div className="mx-auto max-w-7xl p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

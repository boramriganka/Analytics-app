import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, TrendingUp, Package, Users, Split, Undo2, Compass, FileText, ShieldCheck,
  Settings, Upload, MoreHorizontal, RotateCcw, LogOut, X,
} from 'lucide-react';
import { useSession } from '../lib/session';
import { Button } from '../design/primitives';

const PRIMARY_NAV = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/sales', label: 'Sales', icon: TrendingUp },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/channels', label: 'Channels', icon: Split },
  { to: '/app/refunds', label: 'Refunds', icon: Undo2 },
];

const WORKBENCH_NAV = [
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/reports', label: 'Reports', icon: FileText },
  { to: '/app/data-quality', label: 'Data quality', icon: ShieldCheck },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/sales', label: 'Sales', icon: TrendingUp },
  { to: '/app/reports', label: 'Reports', icon: FileText },
];

function NavItem({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: typeof LayoutGrid; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex h-9 items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-sm transition-colors duration-150 ${
          isActive ? 'bg-well font-medium text-ink' : 'text-ink-2 hover:bg-well/60 hover:text-ink'
        }`
      }
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      {label}
    </NavLink>
  );
}

export default function AppShell() {
  const { session, resetDemo, signOut } = useSession();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isDemo = session?.workspace.isDemo ?? false;

  async function onResetDemo() {
    setResetting(true);
    try {
      await resetDemo();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-signal focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-52 flex-col border-r border-line bg-paper print:hidden lg:flex"
        aria-label="Primary"
      >
        <Link to="/" className="flex h-14 items-center gap-2 px-4 font-semibold tracking-tight text-ink">
          <Logo />
          Signalroom
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 pt-1" aria-label="Analytics sections">
          <p className="px-2.5 pt-2 pb-1 font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase">Analyze</p>
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <p className="px-2.5 pt-4 pb-1 font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase">Workbench</p>
          {WORKBENCH_NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-line p-3">
          <Button variant="primary" size="sm" onClick={() => navigate('/onboarding/import')}>
            <Upload size={14} aria-hidden="true" /> Import data
          </Button>
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">{session?.workspace.name}</p>
              {isDemo && <p className="font-mono text-[10px] tracking-wide text-warn uppercase">Sample data</p>}
            </div>
            {isDemo ? (
              <button
                onClick={onResetDemo}
                disabled={resetting}
                title="Reset demo data"
                aria-label="Reset demo data"
                className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition-colors hover:bg-well hover:text-ink disabled:opacity-50"
              >
                <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition-colors hover:bg-well hover:text-ink"
              >
                <LogOut size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-paper/95 px-3 backdrop-blur print:hidden lg:hidden">
        <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
          <Logo /> Signalroom
        </Link>
        {isDemo && (
          <span className="rounded-full border border-warn/30 bg-warn-wash px-2 py-0.5 font-mono text-[10px] tracking-wide text-warn uppercase">
            Sample
          </span>
        )}
      </header>

      {/* Main canvas */}
      <main id="main" className="min-w-0 pb-20 print:pb-0 lg:ml-52 lg:pb-0 print:lg:ml-0">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden"
        aria-label="Primary"
      >
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                isActive ? 'font-medium text-signal-ink' : 'text-ink-2'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-ink-2"
        >
          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
          More
        </button>
      </nav>

      {/* Mobile “More” sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-line bg-panel p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium text-ink">All sections</p>
              <button aria-label="Close" onClick={() => setMoreOpen(false)} className="flex h-8 w-8 items-center justify-center rounded text-ink-2 hover:bg-well">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              {[...PRIMARY_NAV, ...WORKBENCH_NAV].map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setMoreOpen(false)} />
              ))}
            </div>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <Button variant="primary" size="sm" className="flex-1" onClick={() => { setMoreOpen(false); navigate('/onboarding/import'); }}>
                <Upload size={14} aria-hidden="true" /> Import data
              </Button>
              {isDemo && (
                <Button size="sm" onClick={onResetDemo} loading={resetting}>
                  <RotateCcw size={13} aria-hidden="true" /> Reset demo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" className={className} aria-hidden="true">
      <rect x="5" y="18" width="5" height="9" fill="currentColor" />
      <rect x="13.5" y="12" width="5" height="15" fill="currentColor" />
      <rect x="22" y="5" width="5" height="22" fill="var(--color-signal)" />
    </svg>
  );
}

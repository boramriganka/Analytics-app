import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import AppShell from './shell/AppShell';
import { Skeleton } from './design/primitives';

const Landing = lazy(() => import('./pages/public/Landing'));
const Overview = lazy(() => import('./pages/app/Overview'));
const Sales = lazy(() => import('./pages/app/Sales'));
const Products = lazy(() => import('./pages/app/Products'));
const Customers = lazy(() => import('./pages/app/Customers'));
const Channels = lazy(() => import('./pages/app/Channels'));
const Refunds = lazy(() => import('./pages/app/Refunds'));
const Explore = lazy(() => import('./pages/app/Explore'));
const Reports = lazy(() => import('./pages/app/Reports'));
const ReportEditor = lazy(() => import('./pages/app/ReportEditor'));
const DataQuality = lazy(() => import('./pages/app/DataQuality'));
const SettingsPage = lazy(() => import('./pages/app/Settings'));
const ImportWizard = lazy(() => import('./pages/onboarding/ImportWizard'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Zero-friction demo entry: creates a guest session, then lands on Overview. */
function DemoEntry() {
  const { session, startDemo } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!session) await startDemo();
        if (!cancelled) navigate('/app/overview', { replace: true });
      } catch {
        if (!cancelled) navigate('/', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // run once on mount: startDemo/navigate identities are stable enough here
  }, []); // eslint-disable-line
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper" aria-busy="true">
      <p className="text-sm text-ink-2">Opening the sample workspace…</p>
    </div>
  );
}

/** Entering /app without a session silently starts the demo (no login wall). */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/demo" state={{ from: location }} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<DemoEntry />} />
        <Route
          path="/onboarding/import/*"
          element={
            <RequireSession>
              <ImportWizard />
            </RequireSession>
          }
        />
        <Route
          path="/app"
          element={
            <RequireSession>
              <AppShell />
            </RequireSession>
          }
        >
          <Route index element={<Navigate to="/app/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="sales" element={<Sales />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="channels" element={<Channels />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="explore" element={<Explore />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportEditor />} />
          <Route path="data-quality" element={<DataQuality />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

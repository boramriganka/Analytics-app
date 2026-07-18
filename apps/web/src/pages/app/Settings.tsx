import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useSession } from '../../lib/session';
import { Button, Field, Input } from '../../design/primitives';
import { useToast } from '../../design/overlay';

export default function Settings() {
  const { session, register, login, signOut, resetDemo } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const isDemo = session?.workspace.isDemo ?? false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      toast(mode === 'register' ? 'Workspace created — you now have your own private workspace.' : 'Signed in.', { tone: 'success' });
      navigate('/app/overview');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>

      {/* Workspace */}
      <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-panel p-5" aria-label="Workspace">
        <h2 className="text-[15px] font-semibold text-ink">Workspace</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Name</dt>
            <dd className="font-medium text-ink">{session?.workspace.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Type</dt>
            <dd className="font-medium text-ink">{isDemo ? 'Shared sample workspace' : 'Private workspace'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Signed in as</dt>
            <dd className="font-medium text-ink">{session?.user ? `${session.user.name} (${session.user.email})` : 'Guest'}</dd>
          </div>
        </dl>
        {isDemo && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm text-ink-2">
              The sample workspace is shared and periodically reset. Resetting restores the original seeded dataset and removes
              imports, views and reports made here.
            </p>
            <Button
              className="mt-3"
              loading={resetting}
              onClick={async () => {
                setResetting(true);
                try {
                  await resetDemo();
                  toast('Sample data restored', { tone: 'success' });
                } finally {
                  setResetting(false);
                }
              }}
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset sample data
            </Button>
          </div>
        )}
      </section>

      {/* Account */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-panel p-5" aria-label="Account">
        {session?.user ? (
          <>
            <h2 className="text-[15px] font-semibold text-ink">Account</h2>
            <p className="mt-2 text-sm text-ink-2">Signing out returns you to the public site. Your workspace and its data stay saved.</p>
            <Button
              className="mt-3"
              onClick={() => {
                signOut();
                navigate('/');
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-[15px] font-semibold text-ink">
              {mode === 'register' ? 'Create a private workspace' : 'Sign in to your workspace'}
            </h2>
            <p className="mt-1.5 text-sm text-ink-2">
              {mode === 'register'
                ? 'Guest sessions share the sample workspace. An account gives you a private workspace where your imports, views and reports persist.'
                : 'Pick up where you left off.'}
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              {mode === 'register' && (
                <Field label="Name">
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                </Field>
              )}
              <Field label="Email">
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              </Field>
              <Field label="Password" hint={mode === 'register' ? 'At least 8 characters.' : undefined} error={error ?? undefined}>
                <Input
                  required
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </Field>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'register' ? 'login' : 'register');
                    setError(null);
                  }}
                  className="text-sm text-signal-ink hover:underline"
                >
                  {mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create a workspace'}
                </button>
                <Button type="submit" variant="primary" loading={busy}>
                  {mode === 'register' ? 'Create workspace' : 'Sign in'}
                </Button>
              </div>
            </form>
          </>
        )}
      </section>

      <p className="mt-4 px-1 text-xs leading-relaxed text-ink-3">
        Signalroom stores data in a local SQLite database. No third-party services, no tracking, no API keys.
      </p>
    </div>
  );
}

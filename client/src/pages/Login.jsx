import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'form' | 'demo'

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy('form');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function demo() {
    setError(null);
    setBusy('demo');
    try {
      await demoLogin();
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-hairline bg-ink px-4 py-3 text-sm text-cream placeholder:text-ash outline-none transition-colors focus:border-lime/60';

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-ink px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(50% 40% at 50% 0%, rgba(195,236,79,0.06), transparent 70%)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <Link to="/" className="font-display mb-10 block text-center text-2xl font-semibold tracking-tight">
          xorai<span className="text-lime">.</span>
        </Link>

        <div className="rounded-2xl border border-hairline bg-panel p-8">
          <h1 className="font-display text-xl font-semibold">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-fog">
            {mode === 'login' ? 'Sign in to your workspace.' : 'Takes about ten seconds.'}
          </p>

          <button
            onClick={demo}
            disabled={busy !== null}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {busy === 'demo' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Explore with demo account
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-ash">
            <div className="h-px flex-1 bg-hairline" />
            or use email
            <div className="h-px flex-1 bg-hairline" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <input required placeholder="Full name" value={form.name} onChange={set('name')} className={inputCls} />
            )}
            <input
              required
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={set('email')}
              className={inputCls}
            />
            <input
              required
              type="password"
              placeholder={mode === 'register' ? 'Password (8+ characters)' : 'Password'}
              value={form.password}
              onChange={set('password')}
              className={inputCls}
            />
            {error && <p className="text-sm text-[#e66767]">{error}</p>}
            <button
              type="submit"
              disabled={busy !== null}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-hairline px-4 py-3 text-sm font-medium transition-colors hover:border-lime/60 hover:text-lime disabled:opacity-60"
            >
              {busy === 'form' && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-fog">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button onClick={() => { setMode('register'); setError(null); }} className="text-lime hover:underline">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button onClick={() => { setMode('login'); setError(null); }} className="text-lime hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </motion.div>
    </main>
  );
}

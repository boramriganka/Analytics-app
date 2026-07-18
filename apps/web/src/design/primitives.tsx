import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/* ---------------------------------- Button ---------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] text-sm font-medium ' +
  'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-signal text-white hover:bg-signal-ink active:bg-signal-ink',
  secondary: 'border border-line-2 bg-panel text-ink hover:border-ink-3 active:bg-well',
  ghost: 'text-ink-2 hover:bg-well hover:text-ink active:bg-well',
  danger: 'border border-down/40 text-down hover:bg-down-wash',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, className = '', children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${buttonBase} ${buttonVariants[variant]} ${size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3.5'} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
}

/** Icon-only button — accessible name is required, not optional. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] text-ink-2 transition-colors duration-150 hover:bg-well hover:text-ink disabled:opacity-50 ${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ---------------------------------- Input ----------------------------------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`h-9 w-full rounded-[var(--radius-control)] border border-line-2 bg-panel px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-signal focus:outline-none ${className}`}
      {...rest}
    />
  );
});

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-down">
          {error}
        </span>
      )}
    </label>
  );
}

/* ------------------------------ SegmentedControl ----------------------------- */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-[var(--radius-control)] border border-line-2 bg-well p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-[5px] font-medium transition-colors duration-150 ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'} ${
            value === opt.value ? 'bg-panel text-ink shadow-[0_1px_2px_rgba(28,26,23,0.08)]' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- FilterChip -------------------------------- */

export function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full border border-signal/30 bg-signal-wash pr-1 pl-2.5 text-xs text-signal-ink">
      <span className="text-signal-ink/70">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        aria-label={`Remove ${label} filter`}
        onClick={onClear}
        className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full hover:bg-signal/15"
      >
        ×
      </button>
    </span>
  );
}

/* ---------------------------------- states ----------------------------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-well ${className}`} />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center" role="alert">
      <p className="font-medium text-ink">Couldn’t load this</p>
      <p className="max-w-sm text-sm text-ink-2">{message}</p>
      {retry && (
        <Button variant="secondary" size="sm" onClick={retry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}

/* ----------------------------------- misc ------------------------------------ */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-2 bg-well px-1 py-0.5 font-mono text-[10px] text-ink-2">{children}</kbd>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-line ${className}`} />;
}

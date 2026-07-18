import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './primitives';

/* ---------------------------------- Tooltip ---------------------------------- */

/** Hover/focus tooltip for definitions. Content is plain text; stays on for
 * keyboard focus, never blocks the pointer. */
export function InfoTip({ text, label = 'Definition' }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-line-2 font-mono text-[9px] text-ink-3 transition-colors hover:border-ink-3 hover:text-ink-2"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 rounded-md border border-line bg-ink px-3 py-2 text-left text-xs leading-relaxed font-normal text-ink-inverse opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/* ---------------------------------- Dialog ----------------------------------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]')?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel) {
        const focusables = [...panel.querySelectorAll<HTMLElement>('input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
          .filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button aria-label="Close dialog" className="absolute inset-0 bg-ink/35" onClick={onClose} tabIndex={-1} />
      <div
        ref={panelRef}
        className={`relative w-full ${width} max-h-[85dvh] overflow-y-auto rounded-t-xl border border-line bg-panel shadow-xl sm:rounded-xl`}
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-3.5">
          <h2 id={titleId} className="text-[15px] font-semibold text-ink">
            {title}
          </h2>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={15} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* -------------------------------- BottomSheet -------------------------------- */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/35" onClick={onClose} tabIndex={-1} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl border-t border-line bg-panel pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 z-10 border-b border-line bg-panel px-4 pt-3 pb-3">
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-line-2" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            <IconButton label="Close" size="sm" onClick={onClose}>
              <X size={15} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ----------------------------------- Toast ----------------------------------- */

interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<{ toast: (message: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, tone: opts.tone ?? 'default', action: opts.action }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
                t.tone === 'error'
                  ? 'border-down/30 bg-down-wash text-down'
                  : t.tone === 'success'
                    ? 'border-up/30 bg-up-wash text-up'
                    : 'border-line bg-ink text-ink-inverse'
              }`}
            >
              {t.message}
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    setToasts((all) => all.filter((x) => x.id !== t.id));
                  }}
                  className="font-semibold underline underline-offset-2"
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.toast;
}

import { forwardRef } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

const toneMap = {
  info: {
    container: 'bg-brand-50 border-brand-200 text-brand-800 dark:bg-brand-500/10 dark:border-brand-400/20 dark:text-brand-100',
    icon: <Info className="h-4 w-4 text-brand-700 dark:text-brand-300" />,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-400/20 dark:text-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-400/20 dark:text-red-200',
    icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-400/20 dark:text-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  },
};

function Alert({ tone = 'info', title, children, icon, className = '', onDismiss, ...rest }) {
  const t = toneMap[tone];
  return (
    <div
      role="alert"
      className={cx(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-[0.86rem] shadow-sm animate-fade-in',
        t.container,
        className
      )}
      {...rest}
    >
      <div className="mt-0.5 shrink-0">{icon ?? t.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 text-[0.78rem] font-semibold uppercase tracking-wide">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 rounded-md px-1.5 py-0.5 text-[0.72rem] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition"
          aria-label="Dismiss alert"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export { Alert };
export default Alert;

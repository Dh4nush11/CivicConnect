import { createContext, useCallback, useContext, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

const ToastContext = createContext(null);

const toneMap = {
  success: {
    border: 'border-emerald-200 dark:border-emerald-500/20',
    bg: 'bg-white dark:bg-brand-900',
    icon: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
  },
  error: {
    border: 'border-red-200 dark:border-red-500/20',
    bg: 'bg-white dark:bg-brand-900',
    icon: <AlertCircle className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />,
  },
  warn: {
    border: 'border-amber-200 dark:border-amber-500/20',
    bg: 'bg-white dark:bg-brand-900',
    icon: <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
  },
  info: {
    border: 'border-brand-200 dark:border-brand-500/20',
    bg: 'bg-white dark:bg-brand-900',
    icon: <Info className="h-4.5 w-4.5 text-brand-700 dark:text-brand-300 shrink-0 mt-0.5" />,
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 4200) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const showSuccess = (m, d) => addToast(m, 'success', d);
  const showError = (m, d) => addToast(m, 'error', d);
  const showInfo = (m, d) => addToast(m, 'info', d);
  const showWarn = (m, d) => addToast(m, 'warn', d);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarn, toasts }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[100] space-y-2.5 w-80 max-w-[94vw] pointer-events-none"
      >
        {toasts.map((t) => {
          const tone = toneMap[t.type] || toneMap.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-md-plus border ${tone.border} ${tone.bg} px-4 py-3 shadow-pop animate-slide-up`}
              role="status"
            >
              {tone.icon}
              <div className="min-w-0 flex-1 text-[0.84rem] leading-relaxed text-brand-800 dark:text-paper-100 font-medium">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 h-6 w-6 grid place-items-center rounded-md text-brand-500 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-white/5 hover:text-brand-800 dark:hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

import { Loader2 } from 'lucide-react';

const sizeMap = {
  sm: { cls: 'h-4 w-4', wrapper: 'py-8' },
  md: { cls: 'h-7 w-7', wrapper: 'py-12' },
  lg: { cls: 'h-10 w-10', wrapper: 'py-16' },
};

export default function Loader({ fullscreen = false, size = 'md', label, className = '' }) {
  const s = sizeMap[size] || sizeMap.md;
  const spinner = (
    <Loader2 className={`animate-spin text-brand-700 dark:text-brand-200 ${s.cls}`} strokeWidth={2.2} />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-50/80 dark:bg-brand-950/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 surface px-6 py-5 shadow-pop">
          {spinner}
          {label && (
            <span className="text-[0.85rem] font-semibold text-brand-700 dark:text-paper-200">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${s.wrapper} ${className}`}>
      {spinner}
      {label && (
        <span className="text-[0.82rem] font-medium text-brand-600 dark:text-paper-300">
          {label}
        </span>
      )}
    </div>
  );
}

export function InlineLoader({ size = 'sm', className = '' }) {
  const s = sizeMap[size] || sizeMap.sm;
  return (
    <Loader2
      className={`animate-spin text-brand-700 dark:text-brand-200 ${s.cls} ${className}`}
      strokeWidth={2.2}
    />
  );
}

import { forwardRef, Children, isValidElement, cloneElement } from 'react';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

const SegmentedControl = forwardRef(function SegmentedControl({ value, onChange, options = [], size = 'md', className = '' }, ref) {
  const sz =
    size === 'sm'
      ? 'h-8 px-3 text-[0.76rem]'
      : size === 'lg'
        ? 'h-11 px-5 text-[0.9rem]'
        : 'h-9 px-3.5 text-[0.82rem]';
  return (
    <div
      ref={ref}
      role="group"
      aria-label="View switcher"
      className={cx(
        'inline-flex items-center rounded-lg border border-paper-200 bg-paper-50 p-0.5 shadow-inner dark:border-white/10 dark:bg-white/[0.03]',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange && onChange(opt.value)}
            aria-pressed={isActive}
            className={cx(
              'inline-flex items-center gap-1.5 font-semibold rounded-md-plus transition-all tracking-tight',
              sz,
              isActive
                ? 'bg-white text-brand-900 shadow-sm border border-paper-200 dark:bg-brand-900 dark:text-white dark:border-white/10'
                : 'text-brand-600 hover:text-brand-800 hover:bg-white/50 dark:text-paper-300 dark:hover:text-white dark:hover:bg-white/5',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
});

const Modal = forwardRef(function Modal(
  { open, onClose, children, title, description, icon, size = 'md', className = '' },
  ref
) {
  if (!open) return null;
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx(
          'relative z-10 w-full bg-white dark:bg-brand-900 rounded-t-2xl sm:rounded-xl shadow-pop animate-slide-up overflow-hidden border border-paper-200 dark:border-white/10',
          sizeMap[size],
          className
        )}
      >
        {title && (
          <div className="flex items-start gap-3 p-5 sm:p-6 border-b border-paper-200 dark:border-white/10">
            {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
            <div className="min-w-0 flex-1">
              <h3 id="modal-title" className="font-display text-[1.15rem] leading-tight tracking-tightest">
                {title}
              </h3>
              {description && <p className="mt-1 text-sm text-brand-600 dark:text-paper-300">{description}</p>}
            </div>
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
});

const ModalFooter = ({ children, className = '' }) => (
  <div className={cx('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-5 border-t border-paper-200 dark:border-white/10', className)}>
    {children}
  </div>
);

function Tooltip({ label, children, side = 'top' }) {
  return (
    <span className="group relative inline-flex">
      {Children.map(children, (child) =>
        isValidElement(child) ? cloneElement(child) : child
      )}
      <span
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md-plus bg-brand-900 px-2 py-1 text-[0.7rem] font-medium text-white opacity-0 shadow-pop transition duration-150 group-hover:opacity-100 dark:bg-brand-100 dark:text-brand-900',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-2 -translate-x-1/2',
          side === 'left' && 'right-full top-1/2 mr-2 -translate-y-1/2',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2'
        )}
      >
        {label}
      </span>
    </span>
  );
}

export { SegmentedControl, Modal, ModalFooter, Tooltip };

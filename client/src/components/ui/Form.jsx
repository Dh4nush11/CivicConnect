import { forwardRef } from 'react';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

const Input = forwardRef(function Input({ className = '', error, id, label, help, required, ...rest }, ref) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-1 text-accent-600">*</span>}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={cx('input-base', error && 'input-error', className)}
        aria-invalid={!!error}
        aria-describedby={error || help ? `${id}-msg` : undefined}
        {...rest}
      />
      {(error || help) && (
        <p id={`${id}-msg`} className={cx('text-xs leading-relaxed', error ? 'text-red-600 dark:text-red-400' : 'text-brand-600/80 dark:text-paper-300')}>
          {error || help}
        </p>
      )}
    </div>
  );
});

const Select = forwardRef(function Select({ className = '', error, id, label, help, required, children, ...rest }, ref) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-1 text-accent-600">*</span>}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={cx('input-base appearance-none bg-[image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3E%3Cpath%20stroke=%27%23444%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.6%27%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E")] bg-[length:1.1rem_1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9 cursor-pointer',
          error && 'input-error',
          className
        )}
        aria-invalid={!!error}
        {...rest}
      >
        {children}
      </select>
      {(error || help) && (
        <p className={cx('text-xs leading-relaxed', error ? 'text-red-600 dark:text-red-400' : 'text-brand-600/80 dark:text-paper-300')}>
          {error || help}
        </p>
      )}
    </div>
  );
});

const Textarea = forwardRef(function Textarea({ className = '', error, id, label, help, required, rows = 4, ...rest }, ref) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-1 text-accent-600">*</span>}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        className={cx('input-base resize-y', error && 'input-error', className)}
        aria-invalid={!!error}
        {...rest}
      />
      {(error || help) && (
        <p className={cx('text-xs leading-relaxed', error ? 'text-red-600 dark:text-red-400' : 'text-brand-600/80 dark:text-paper-300')}>
          {error || help}
        </p>
      )}
    </div>
  );
});

export { Input, Select, Textarea };

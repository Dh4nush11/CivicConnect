import { forwardRef, Children } from 'react';
import { Loader2 } from 'lucide-react';

const sizes = {
  xs: 'h-8 px-3 text-[0.76rem] gap-1.5',
  sm: 'h-9 px-3.5 text-[0.8rem] gap-1.5',
  md: 'h-10 px-4 text-[0.86rem] gap-2',
  lg: 'h-11.5 px-5 text-[0.92rem] gap-2 py-3',
};

const variants = {
  primary:
    'bg-brand-900 text-white border border-brand-900 hover:bg-brand-800 active:bg-brand-950 disabled:bg-brand-400 dark:bg-brand-100 dark:text-brand-900 dark:border-brand-100 dark:hover:bg-white',
  accent:
    'bg-accent-600 text-white border border-accent-600 hover:bg-accent-500 active:bg-accent-700',
  secondary:
    'bg-white text-brand-900 border border-paper-300 hover:bg-paper-50 hover:border-brand-300 dark:bg-brand-900 dark:text-paper-100 dark:border-white/10 dark:hover:bg-white/5 dark:hover:border-white/20',
  ghost:
    'bg-transparent text-brand-800 border border-transparent hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5',
  outline:
    'bg-transparent text-brand-900 border border-brand-300 hover:bg-brand-50 dark:text-paper-100 dark:border-brand-400/50 dark:hover:bg-white/5',
  danger:
    'bg-red-600 text-white border border-red-600 hover:bg-red-500 active:bg-red-700',
  'danger-ghost':
    'bg-transparent text-red-700 border border-transparent hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20',
};

const iconOnly = {
  xs: 'h-8 w-8 p-0',
  sm: 'h-9 w-9 p-0',
  md: 'h-10 w-10 p-0',
  lg: 'h-11 w-11 p-0',
};

function cx(...args) {
  return args.filter(Boolean).join(' ');
}

const Button = forwardRef(function Button(
  {
    as: Comp = 'button',
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    className = '',
    fullWidth = false,
    isIconOnly = false,
    ...rest
  },
  ref
) {
  const content = Children.count(children) ? children : null;
  const showLeft = loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon;
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-md-plus font-semibold tracking-tight transition-all duration-150 select-none',
        'shadow-sm active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        isIconOnly ? iconOnly[size] : sizes[size],
        fullWidth && 'w-full',
        loading && 'btn-loading',
        className
      )}
      {...rest}
    >
      {showLeft ? <span className="shrink-0">{showLeft}</span> : null}
      {content}
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </Comp>
  );
});

export { Button };
export default Button;

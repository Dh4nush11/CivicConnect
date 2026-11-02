import { forwardRef } from 'react';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

function Card({ className = '', hover = false, padded = true, children, ...rest }) {
  return (
    <section
      className={cx(
        'surface transition',
        hover && 'hover:-translate-y-0.5 hover:shadow-card-hover',
        padded && 'p-5 sm:p-6',
        className
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

const CardHeader = forwardRef(function CardHeader({ className = '', children, ...rest }, ref) {
  return (
    <header ref={ref} className={cx('flex flex-col gap-1.5 pb-4 mb-4 border-b border-paper-200 dark:border-white/10', className)} {...rest}>
      {children}
    </header>
  );
});

const CardTitle = forwardRef(function CardTitle({ as: Tag = 'h3', className = '', children, eyebrow, ...rest }, ref) {
  return (
    <div ref={ref} className={className} {...rest}>
      {eyebrow ? <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400">{eyebrow}</span> : null}
      <Tag className="font-display tracking-tightest text-brand-950 dark:text-white text-[1.05rem] leading-tight">
        {children}
      </Tag>
    </div>
  );
});

const CardFooter = forwardRef(function CardFooter({ className = '', children, ...rest }, ref) {
  return (
    <footer ref={ref} className={cx('mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-paper-200 dark:border-white/10', className)} {...rest}>
      {children}
    </footer>
  );
});

const CardBody = forwardRef(function CardBody({ className = '', children, ...rest }, ref) {
  return <div ref={ref} className={cx('', className)} {...rest}>{children}</div>;
});

export { Card, CardHeader, CardTitle, CardFooter, CardBody };
export default Card;

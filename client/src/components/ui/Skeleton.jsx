import { forwardRef } from 'react';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

function Skeleton({ className = '', children, count = 1 }) {
  if (children) {
    return (
      <div aria-hidden className={cx('animate-pulse', className)}>
        {children}
      </div>
    );
  }
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className={cx('skeleton', className)} />
  ));
}

const SkeletonLine = ({ className = '' }) => <Skeleton className={cx('h-3 w-full', className)} />;

function SkeletonCard({ className = '' }) {
  return (
    <div className={cx('surface p-5 animate-pulse', className)}>
      <div className="skeleton h-3 w-24 mb-4" />
      <div className="skeleton h-8 w-28 mb-1" />
      <div className="skeleton h-3 w-40 mt-4" />
    </div>
  );
}

function SkeletonIssueCard({ className = '' }) {
  return (
    <article className={cx('surface overflow-hidden animate-pulse', className)}>
      <div className="skeleton h-40 w-full rounded-none border-b border-paper-200 dark:border-white/10" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-badge" />
          <div className="skeleton h-5 w-20 rounded-badge" />
          <div className="skeleton h-5 w-14 rounded-badge ml-auto" />
        </div>
        <div className="skeleton h-5 w-11/12" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-10/12" />
        <div className="skeleton h-3 w-8/12" />
        <div className="skeleton h-8 w-full rounded-md-plus" />
      </div>
    </article>
  );
}

const Avatar = forwardRef(function Avatar(
  { name = '', initials = '', size = 'md', className = '', rounded = 'full', bg = 'brand', shape = 'circle', seed },
  ref
) {
  const sizeMap = {
    xs: 'h-6 w-6 text-[0.6rem]',
    sm: 'h-8 w-8 text-[0.7rem]',
    md: 'h-9 w-9 text-[0.82rem]',
    lg: 'h-11 w-11 text-[0.95rem]',
    xl: 'h-14 w-14 text-[1.1rem]',
  };
  const bgMap = {
    brand: 'bg-brand-700 text-white',
    accent: 'bg-accent-600 text-white',
    soft: 'bg-paper-100 text-brand-800 border border-paper-200 dark:bg-white/5 dark:text-paper-100 dark:border-white/10',
    emerald: 'bg-emerald-600 text-white',
    violet: 'bg-violet-700 text-white',
    amber: 'bg-amber-600 text-white',
    rose: 'bg-rose-600 text-white',
  };
  let inits = initials;
  if (!inits && name) {
    inits = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  const shapeCls = shape === 'square' ? 'rounded-md-plus' : 'rounded-full';
  return (
    <div
      ref={ref}
      title={name}
      aria-label={name || initials || 'avatar'}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-display font-semibold tracking-tight uppercase shadow-sm ring-2 ring-white dark:ring-brand-900',
        sizeMap[size],
        bgMap[bg] || bgMap.brand,
        shapeCls,
        rounded === 'md' && 'rounded-md-plus',
        className
      )}
    >
      {inits || '?'}
    </div>
  );
});

export { Skeleton, SkeletonLine, SkeletonCard, SkeletonIssueCard, Avatar };
export default Skeleton;

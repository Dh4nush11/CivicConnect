import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

function cx(...a) { return a.filter(Boolean).join(' '); }

function StatCard({ label, value, hint, icon, trend, trendLabel, color = 'brand', className = '', onClick }) {
  const colorMap = {
    brand: { dot: 'bg-brand-700 dark:bg-brand-200', text: 'text-brand-700 dark:text-brand-200', soft: 'bg-brand-50 dark:bg-brand-500/10 border-brand-100 dark:border-brand-500/15' },
    blue: { dot: 'bg-blue-600', text: 'text-blue-700 dark:text-blue-300', soft: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/15' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', soft: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/15' },
    emerald: { dot: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', soft: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/15' },
    rose: { dot: 'bg-red-600', text: 'text-red-700 dark:text-red-300', soft: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/15' },
    violet: { dot: 'bg-violet-600', text: 'text-violet-700 dark:text-violet-300', soft: 'bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/15' },
  };
  const c = colorMap[color] || colorMap.brand;
  const trendDir = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  const trendColor = trendDir === 'up' ? 'text-emerald-600 dark:text-emerald-300' : trendDir === 'down' ? 'text-red-600 dark:text-red-300' : 'text-brand-500';

  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'surface hover:shadow-card-hover transition relative p-4 sm:p-5 text-left w-full overflow-hidden group',
        onClick && 'cursor-pointer active:translate-y-[1px]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[0.76rem] font-medium uppercase tracking-wider text-brand-600 dark:text-paper-300">
            <span className={cx('h-1.5 w-1.5 rounded-full', c.dot)} />
            {label}
          </div>
          <div className="mt-2 font-display tracking-tightest text-[2rem] leading-none text-brand-950 dark:text-white tabular">
            {value}
          </div>
        </div>
        {icon && (
          <div className={cx('shrink-0 rounded-lg border p-2.5', c.soft)}>
            <span className={c.text}>{icon}</span>
          </div>
        )}
      </div>
      {(trend !== undefined || hint) && (
        <div className="mt-3.5 flex items-center justify-between text-[0.76rem]">
          {hint && <span className="truncate text-brand-600/80 dark:text-paper-300">{hint}</span>}
          {trend !== undefined && (
            <span className={cx('inline-flex items-center gap-1 font-medium', trendColor)}>
              {trendDir === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {trendDir === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              {trendDir === 'flat' && <Minus className="h-3.5 w-3.5" />}
              {trendLabel || `${Math.abs(trend)}%`}
            </span>
          )}
        </div>
      )}
    </Comp>
  );
}

export { StatCard };
export default StatCard;

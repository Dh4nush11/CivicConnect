import { Inbox, SearchX, FileWarning } from 'lucide-react';
import { Button } from '../components/ui/Button';

const iconMap = {
  inbox: Inbox,
  search: SearchX,
  warning: FileWarning,
};

export default function EmptyState({
  icon = 'inbox',
  title = 'Nothing here yet',
  description = 'Check back later for updates.',
  action,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) {
  const Icon = typeof icon === 'string' ? (iconMap[icon] || Inbox) : icon;
  const pad = compact ? 'p-6 sm:p-8' : 'p-10 sm:p-14';
  return (
    <div className={`surface ${pad} text-center ${className}`}>
      <div className="mx-auto mb-5 inline-flex items-center justify-center h-14 w-14 rounded-xl border border-paper-200 dark:border-white/10 bg-paper-50 dark:bg-white/[0.03] text-brand-600 dark:text-paper-300">
        <Icon className="h-7 w-7" strokeWidth={1.8} />
      </div>
      <h3 className="font-display tracking-tightest text-[1.15rem] text-brand-950 dark:text-white mb-1.5">
        {title}
      </h3>
      <p className="mx-auto max-w-sm text-[0.88rem] text-brand-700/80 dark:text-paper-300 mb-6 leading-relaxed">
        {description}
      </p>
      {(action || (onAction && actionLabel)) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {action}
          {onAction && actionLabel && !action && (
            <Button onClick={onAction} variant="primary">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

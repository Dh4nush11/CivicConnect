import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  LoaderCircle,
  CopyX,
  MapPinHouse,
  Trash2,
  Lightbulb,
  Droplets,
  CircleDashed,
} from 'lucide-react';

const statusMeta = {
  reported: {
    label: 'Reported',
    tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    dot: 'bg-blue-600 dark:bg-blue-400',
    ring: 'ring-blue-600/20',
    icon: CircleDashed,
  },
  submitted: {
    label: 'Submitted',
    tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    dot: 'bg-blue-600 dark:bg-blue-400',
    ring: 'ring-blue-600/20',
    icon: CircleDashed,
  },
  'in-progress': {
    label: 'In Progress',
    tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/20',
    icon: LoaderCircle,
  },
  in_progress: {
    label: 'In Progress',
    tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/20',
    icon: LoaderCircle,
  },
  resolved: {
    label: 'Resolved',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    ring: 'ring-emerald-600/20',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
    dot: 'bg-red-600 dark:bg-red-400',
    ring: 'ring-red-600/20',
    icon: CircleX,
  },
  duplicate: {
    label: 'Duplicate',
    tone: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
    dot: 'bg-violet-600 dark:bg-violet-400',
    ring: 'ring-violet-600/20',
    icon: CopyX,
  },
};

const categoryMeta = {
  pothole: { label: 'Pothole', icon: AlertTriangle, color: '#64748b', tone: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-400/20' },
  garbage: { label: 'Garbage', icon: Trash2, color: '#115e59', tone: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/10 dark:text-teal-200 dark:border-teal-400/20' },
  streetlight: { label: 'Streetlight', icon: Lightbulb, color: '#a16207', tone: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-200 dark:border-yellow-400/20' },
  water: { label: 'Water Leak', icon: Droplets, color: '#0e7490', tone: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:border-cyan-400/20' },
  sewage: { label: 'Sewage', icon: MapPinHouse, color: '#4c1d95', tone: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-200 dark:border-purple-400/20' },
  other: { label: 'Other', icon: CircleDashed, color: '#475569', tone: 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-200 dark:border-zinc-400/20' },
};

const priorityMeta = {
  low: { label: 'Low', tone: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200' },
  medium: { label: 'Medium', tone: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200' },
  high: { label: 'High', tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-200' },
};

const roleMeta = {
  citizen: { label: 'Citizen', tone: 'bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-500/10 dark:text-brand-200' },
  officer: { label: 'Municipal Officer', tone: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-500/10 dark:text-accent-200' },
  admin: { label: 'Admin', tone: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-200' },
};

function cx(...args) {
  return args.filter(Boolean).join(' ');
}

function Badge({ children, className = '', tone = '', size = 'md', title }) {
  const sz =
    size === 'sm'
      ? 'px-2 py-0.5 text-[0.68rem] gap-1'
      : size === 'lg'
        ? 'px-3 py-1 text-[0.8rem] gap-1.5'
        : 'px-2.5 py-1 text-[0.74rem] gap-1.5';
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-badge border font-medium tracking-tight whitespace-nowrap',
        tone || 'bg-paper-50 text-brand-800 border-paper-200 dark:bg-white/5 dark:text-paper-200 dark:border-white/10',
        sz,
        className
      )}
      title={title}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status, showIcon = true, size = 'md', className }) {
  const m = statusMeta[status] || statusMeta.reported;
  const Icon = m.icon;
  return (
    <Badge tone={m.tone} size={size} className={cx('ring-1 ring-inset', m.ring, className)}>
      {showIcon ? <Icon className={cx('h-3.5 w-3.5', ['in-progress', 'in_progress'].includes(status) && 'animate-spin')} /> : <span className={cx('h-1.5 w-1.5 rounded-full', m.dot)} />}
      {m.label}
    </Badge>
  );
}

function CategoryBadge({ category, categoryDetails = '', showIcon = true, size = 'md', className }) {
  const c = categoryMeta[category] || categoryMeta.other;
  const Icon = c.icon;
  const details = category === 'other' ? categoryDetails.trim() : '';
  return (
    <Badge
      tone={c.tone}
      size={size}
      className={cx('max-w-full', className)}
      title={details ? `Other: ${details}` : undefined}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />}
      {details ? (
        <span className="truncate">{c.label}: {details}</span>
      ) : c.label}
    </Badge>
  );
}

function PriorityBadge({ priority, size = 'md', className }) {
  const p = priorityMeta[priority] || priorityMeta.medium;
  return (
    <Badge tone={p.tone} size={size} className={className}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {p.label}
    </Badge>
  );
}

function RoleBadge({ role, size = 'sm', className }) {
  const r = roleMeta[role] || roleMeta.citizen;
  return (
    <Badge tone={r.tone} size={size} className={className}>
      {r.label}
    </Badge>
  );
}

function DotBadge({ status, size = 'md', className }) {
  const m = statusMeta[status] || statusMeta.reported;
  return (
    <span className={cx('inline-flex items-center gap-2 text-xs font-medium text-brand-700 dark:text-paper-200', className)}>
      <span className={cx(
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
        'rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.6)]',
        m.dot
      )} />
      {m.label}
    </span>
  );
}

export { Badge, StatusBadge, CategoryBadge, PriorityBadge, RoleBadge, DotBadge, statusMeta, categoryMeta, priorityMeta, roleMeta };
export default Badge;

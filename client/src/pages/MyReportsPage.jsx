import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, Inbox, FolderKanban, SearchX, ChevronLeft, ChevronRight, MapPin, CircleDashed, LoaderCircle, CheckCircle2, CircleX } from 'lucide-react';
import { getMyIssues } from '../services/issueService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { StatusBadge, CategoryBadge, Badge, DotBadge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Skeleton';
import { timeAgo } from '../utils/format';

const FILTERS = [
  { key: 'all', label: 'All Reports', color: 'brand', icon: FolderKanban },
  { key: 'submitted', label: 'Submitted', color: 'blue', icon: CircleDashed },
  { key: 'in_progress', label: 'In Progress', color: 'amber', icon: LoaderCircle },
  { key: 'resolved', label: 'Resolved', color: 'emerald', icon: CheckCircle2 },
];

export default function MyReportsPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const { showError } = useToast();
  const { user } = useAuth();

  const fetchIssues = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyIssues({ page, limit: pagination.limit, status: statusFilter });
      if (res.success) {
        setIssues(res.data.issues);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const byStatus = useMemo(() => {
    const counts = {
      all: pagination.total,
      submitted: 0,
      in_progress: 0,
      resolved: 0,
    };
    issues.forEach((i) => {
      if (counts[i.status] !== undefined) counts[i.status]++;
    });
    return counts;
  }, [issues, pagination.total]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar name={user?.name} size="md" tone="accent" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DotBadge tone="bg-emerald-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-500 dark:text-paper-400">
                Dashboard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-brand-900 dark:text-paper-100">
              Hi, {user?.name}
            </h1>
            <p className="text-paper-600 dark:text-paper-400 mt-1 text-sm">
              Here are all the issues you've reported and their current status.
            </p>
          </div>
        </div>
        <Link to="/report">
          <Button variant="accent" size="md">
            <FilePlus2 className="h-4 w-4 mr-1.5" />
            Report New Issue
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`relative text-left surface rounded-md-plus p-3 sm:p-4 transition-all group ${
                active
                  ? 'ring-2 ring-brand-500/40 dark:ring-brand-400/40 border-brand-400/40 dark:border-brand-500/40'
                  : 'hover:shadow-card-hover hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg ${
                  f.color === 'brand'
                    ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                    : f.color === 'blue'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : f.color === 'amber'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : f.color === 'emerald'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}>
                  <Icon className={`h-3.5 w-3.5 ${f.key === 'in_progress' ? 'animate-spin' : ''}`} />
                </span>
                {active && (
                  <span className="h-2 w-2 rounded-full bg-brand-500 dark:bg-brand-400 shadow-[0_0_0_4px_rgba(37,99,235,0.15)]" />
                )}
              </div>
              <div className="text-2xl font-bold font-display tabular text-brand-900 dark:text-paper-100 mb-0.5">
                {byStatus[f.key] ?? 0}
              </div>
              <div className="text-[11px] font-medium text-paper-600 dark:text-paper-400">
                {f.label}
              </div>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => fetchIssues(1)} />
      ) : issues.length === 0 ? (
        <EmptyState
          iconKey={statusFilter === 'all' ? 'inbox' : 'search'}
          title={statusFilter === 'all' ? "You haven't reported any issues yet" : 'No issues match this filter'}
          description={statusFilter === 'all' ? 'Start by reporting the first issue you spot around you!' : 'Try a different status filter from the cards above.'}
          action={
            statusFilter === 'all' ? (
              <Link to="/report">
                <Button variant="primary" size="md">
                  <FilePlus2 className="h-4 w-4 mr-1.5" />
                  Report an Issue
                </Button>
              </Link>
            ) : null
          }
          compact={false}
        />
      ) : (
        <div className="space-y-4">
          <div className="surface rounded-md-plus overflow-hidden">
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-paper-500 dark:text-paper-400 border-b border-paper-100 dark:border-brand-800 bg-paper-50 dark:bg-brand-900/40 sticky top-0">
              <div className="md:col-span-5">Issue</div>
              <div className="md:col-span-2">Category</div>
              <div className="md:col-span-2">Status</div>
              <div className="md:col-span-2">Assigned To</div>
              <div className="md:col-span-1 text-right">Updated</div>
            </div>
            <ul className="divide-y divide-paper-100 dark:divide-brand-800">
              {issues.map((issue) => (
                <li key={issue._id}>
                  <Link
                    to={`/issues/${issue._id}`}
                    className="block hover:bg-paper-50 dark:hover:bg-brand-900/30 transition-colors group"
                  >
                    <div className="grid md:grid-cols-12 gap-3 items-center px-5 py-4">
                      <div className="md:col-span-5 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-brand-900 dark:text-paper-100 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                            {issue.title}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 md:hidden">
                          <StatusBadge status={issue.status} size="sm" />
                          <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} size="sm" />
                        </div>
                        {issue.location?.address && (
                          <div className="flex items-center gap-1 text-xs text-paper-500 dark:text-paper-400 mt-1.5 line-clamp-1">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-paper-400" />
                            <span className="truncate">{issue.location.address}</span>
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-paper-400 md:hidden tabular">
                          {timeAgo(issue.updatedAt)}
                        </div>
                      </div>
                      <div className="md:col-span-2 hidden md:block">
                        <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} />
                      </div>
                      <div className="md:col-span-2 hidden md:block">
                        <StatusBadge status={issue.status} />
                      </div>
                      <div className="md:col-span-2 hidden md:block text-sm text-paper-700 dark:text-paper-300">
                        {issue.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={issue.assignedToName} size="xs" tone="soft" />
                            <span className="truncate">{issue.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-paper-400 dark:text-paper-500 italic text-xs">
                            Not assigned
                          </span>
                        )}
                      </div>
                      <div className="md:col-span-1 hidden md:block text-sm text-paper-500 dark:text-paper-400 text-right tabular">
                        {timeAgo(issue.updatedAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-paper-500 dark:text-paper-400 tabular">
                Page {pagination.page} of {pagination.pages} · {pagination.total} total reports
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchIssues(pagination.page - 1)}
                  iconOnly
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: pagination.pages }).slice(0, 5).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => fetchIssues(p)}
                        className={`h-8 min-w-[2rem] px-2 rounded-md text-xs tabular transition-colors ${
                          pagination.page === p
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-paper-600 dark:text-paper-400 hover:bg-paper-100 dark:hover:bg-brand-800'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {pagination.pages > 5 && (
                    <span className="text-paper-400 text-xs px-1">…</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => fetchIssues(pagination.page + 1)}
                  iconOnly
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

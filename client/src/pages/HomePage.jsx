import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  LoaderCircle,
  CheckCircle2,
  ThumbsUp,
  RotateCw,
  Columns3,
  LayoutGrid,
  List,
  Map,
  FilePlus2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getIssues } from '../services/issueService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import IssueCard from '../components/IssueCard';
import MapView from '../components/MapView';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { SkeletonIssueCard } from '../components/ui/Skeleton';
import { StatCard } from '../components/ui/StatCard';
import { SegmentedControl } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Form';
import { CATEGORY_LABELS, STATUS_LABELS } from '../utils/format';
import { INDORE_CENTER, INDORE_MAP_ZOOM } from '../constants/location';

const CATEGORIES = ['all', 'pothole', 'garbage', 'streetlight', 'water', 'sewage', 'other'];
const STATUSES = ['all', 'submitted', 'in_progress', 'resolved'];

const VIEW_OPTIONS = [
  { value: 'split', label: 'Split', icon: Columns3 },
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
  { value: 'map', label: 'Map', icon: Map },
];

export default function HomePage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    sort: 'newest',
    view: 'split',
  });
  const { showError: toastError } = useToast();
  const { user, isAuthenticated } = useAuth();

  const fetchIssues = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        category: filters.category === 'all' ? undefined : filters.category,
        status: filters.status === 'all' ? undefined : filters.status,
        sort: filters.sort,
        page,
        limit: pagination.limit,
      };
      const res = await getIssues(params);
      if (res.success) {
        setIssues(res.data.issues);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.status, filters.sort]);

  const stats = useMemo(() => {
    const total = pagination.total || 0;
    const resolved = issues.filter((i) => i.status === 'resolved').length;
    const inProg = issues.filter((i) => i.status === 'in_progress' || i.status === 'in-progress').length;
    const upvotes = issues.reduce((a, b) => a + (b.upvoteCount || b.upvotes?.length || 0), 0);
    return { total, resolved, inProg, upvotes };
  }, [issues, pagination.total]);

  const mapIssues = filters.view !== 'list' ? issues : [];
  const view = filters.view;

  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden surface !p-0">
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-6 sm:p-8 lg:p-10 relative">
            <div className="inline-flex items-center gap-1.5 rounded-badge bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400 border border-accent-100 dark:border-accent-500/20 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Civic Issue Platform
            </div>
            <h1 className="mt-4 font-display tracking-tightest text-[1.85rem] sm:text-[2.2rem] lg:text-[2.5rem] leading-[1.08] text-brand-950 dark:text-white max-w-xl">
              Report issues. Make Indore{' '}
              <span className="relative inline-block">
                <span className="relative text-accent-600 dark:text-accent-400">work better.</span>
                <span className="absolute left-0 right-0 -bottom-1 h-1 bg-accent-500/30 dark:bg-accent-400/40 rounded-full" />
              </span>
            </h1>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-brand-700/85 dark:text-paper-200 max-w-xl">
              CivicConnect connects Indore residents with local authorities. Report potholes, garbage, broken streetlights, water leaks & more with photo evidence and precise location.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {isAuthenticated && user?.role === 'citizen' ? (
                <Link to="/report">
                  <Button variant="primary" size="lg" leftIcon={<FilePlus2 className="h-4.5 w-4.5" />}>
                    Report an Issue
                  </Button>
                </Link>
              ) : isAuthenticated && ['officer', 'admin'].includes(user?.role) ? (
                <Link to="/admin">
                  <Button variant="primary" size="lg" leftIcon={<FilePlus2 className="h-4.5 w-4.5" />}>
                    Open Staff Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button variant="primary" size="lg" leftIcon={<FilePlus2 className="h-4.5 w-4.5" />}>
                    Join to Report
                  </Button>
                </Link>
              )}
              {!isAuthenticated && (
                <Link to="/login">
                  <Button variant="secondary" size="lg">
                    Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats strip */}
            <div className="mt-8 -mx-1 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatCard
                label="Reported"
                value={stats.total}
                icon={<FileText className="h-4.5 w-4.5" />}
                color="blue"
                className="!py-3 !p-4"
              />
              <StatCard
                label="In Progress"
                value={stats.inProg}
                icon={<LoaderCircle className="h-4.5 w-4.5" />}
                color="amber"
                className="!py-3 !p-4"
              />
              <StatCard
                label="Resolved"
                value={stats.resolved}
                icon={<CheckCircle2 className="h-4.5 w-4.5" />}
                color="emerald"
                className="!py-3 !p-4"
              />
              <StatCard
                label="Upvotes"
                value={stats.upvotes}
                icon={<ThumbsUp className="h-4.5 w-4.5" />}
                color="brand"
                className="!py-3 !p-4"
              />
            </div>
          </div>

          <div className="hidden lg:block relative border-t lg:border-t-0 lg:border-l border-paper-200 dark:border-white/10 bg-paper-50 dark:bg-white/[0.02]">
            <div className="absolute inset-0 p-5">
              <div className="relative h-full rounded-lg overflow-hidden border border-paper-200 dark:border-white/10">
                <MapView
                  issues={mapIssues}
                  initialCenter={INDORE_CENTER}
                  initialZoom={INDORE_MAP_ZOOM}
                  height="h-full"
                  className="!rounded-lg !border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <section className="sticky top-16 sm:top-[65px] z-30 -mx-1 px-1 py-2 -mt-1 backdrop-blur-md bg-paper-50/85 dark:bg-brand-950/85">
        <div className="surface !p-3 sm:!p-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            {/* Category chips */}
            <div className="min-w-0 flex-1">
              <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-brand-600 dark:text-paper-300 mb-1.5 px-0.5">
                Category
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
                {CATEGORIES.map((k) => {
                  const active = filters.category === k;
                  const label = CATEGORY_LABELS[k] || k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilters({ ...filters, category: k })}
                      className={`chip whitespace-nowrap ${active ? 'chip-active' : ''}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden lg:block w-px self-stretch bg-paper-200 dark:bg-white/10" />

            {/* Status chips */}
            <div className="min-w-0 lg:w-auto lg:flex-shrink-0">
              <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-brand-600 dark:text-paper-300 mb-1.5 px-0.5">
                Status
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
                {STATUSES.map((k) => {
                  const active = filters.status === k;
                  const label = STATUS_LABELS[k] || k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilters({ ...filters, status: k })}
                      className={`chip whitespace-nowrap ${active ? 'chip-active' : ''}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between lg:justify-end gap-2.5 mt-0.5">
              <div className="w-[calc(50%-0.3rem)] sm:w-44">
                <Select
                  id="home-sort"
                  label="Sort By"
                  value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="upvotes">Most Upvoted</option>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <SegmentedControl
                  value={view}
                  onChange={(v) => setFilters({ ...filters, view: v })}
                  options={VIEW_OPTIONS}
                  size="sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  onClick={() => fetchIssues(pagination.page)}
                  loading={loading}
                  aria-label="Refresh"
                  title="Refresh"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      {loading ? (
        <IssueGridSkeleton view={view} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => fetchIssues(pagination.page)} />
      ) : issues.length === 0 ? (
        <EmptyState
          icon="search"
          title="No issues found"
          description="Try adjusting filters, or be the first to report an issue in your area."
          action={
            isAuthenticated && user?.role === 'citizen' ? (
              <Link to="/report">
                <Button variant="primary" leftIcon={<FilePlus2 className="h-4 w-4" />}>
                  Report First Issue
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {view === 'split' && (
            <div className="grid lg:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-5 sm:space-y-6 min-w-0">
                <IssueGrid issues={issues} />
                <Pagination pagination={pagination} onPageChange={fetchIssues} />
              </div>
              <div className="lg:sticky lg:top-[154px] h-[520px] sm:h-[560px] lg:h-[calc(100vh-180px)] min-h-[420px]">
                <MapView
                  issues={mapIssues}
                  initialCenter={INDORE_CENTER}
                  initialZoom={INDORE_MAP_ZOOM}
                  height="h-full"
                />
              </div>
            </div>
          )}
          {view === 'grid' && (
            <>
              <IssueGrid issues={issues} />
              <Pagination pagination={pagination} onPageChange={fetchIssues} />
            </>
          )}
          {view === 'list' && (
            <>
              <div className="space-y-2.5 sm:space-y-3">
                {issues.map((issue) => (
                  <IssueCard key={issue._id} issue={issue} compact />
                ))}
              </div>
              <Pagination pagination={pagination} onPageChange={fetchIssues} />
            </>
          )}
          {view === 'map' && (
            <div className="h-[580px] sm:h-[640px]">
              <MapView
                issues={issues}
                initialCenter={INDORE_CENTER}
                initialZoom={INDORE_MAP_ZOOM}
                height="h-full"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IssueGrid({ issues }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-5">
      {issues.map((issue) => (
        <IssueCard key={issue._id} issue={issue} />
      ))}
    </div>
  );
}

function IssueGridSkeleton({ view }) {
  if (view === 'map') {
    return (
      <div className="h-[580px] sm:h-[640px] surface !p-0 overflow-hidden animate-pulse">
        <div className="w-full h-full bg-skeleton" />
      </div>
    );
  }
  if (view === 'list') {
    return (
      <div className="space-y-2.5 sm:space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonIssueCard key={i} />
        ))}
      </div>
    );
  }
  if (view === 'split') {
    return (
      <div className="grid lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonIssueCard key={i} />
          ))}
        </div>
        <div className="h-[520px] sm:h-[560px] surface !p-0 overflow-hidden animate-pulse">
          <div className="w-full h-full bg-skeleton" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonIssueCard key={i} />
      ))}
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  const { page, pages, total } = pagination;
  if (pages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-5 mt-2 border-t border-paper-200 dark:border-white/10">
      <p className="text-[0.8rem] text-brand-600/80 dark:text-paper-300 tabular">
        Page <span className="font-semibold text-brand-900 dark:text-white">{page}</span> of{' '}
        <span className="font-semibold text-brand-900 dark:text-white">{pages}</span>
        <span className="mx-1.5 text-paper-300 dark:text-white/20">·</span>
        {total} total
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Prev
        </Button>
        <div className="text-[0.8rem] font-semibold tabular text-brand-700 dark:text-paper-200 px-2">
          {page} / {pages}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={page === pages}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

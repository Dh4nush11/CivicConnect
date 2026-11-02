import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getIssueById,
  upvoteIssue,
  addComment,
  deleteIssue,
  reopenIssue,
} from '../services/issueService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MapView from '../components/MapView';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import IssueEditDialog from '../components/IssueEditDialog';
import { StatusBadge, PriorityBadge, CategoryBadge, RoleBadge, DotBadge } from '../components/ui/Badge';
import { Avatar, Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Form';
import { formatDateTime, timeAgo } from '../utils/format';
import {
  ArrowLeft,
  ThumbsUp,
  MapPin,
  Navigation2,
  User,
  Clock,
  Wrench,
  CheckCheck,
  FileText,
  MessageSquare,
  CopyX,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';

export default function IssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [upvoteState, setUpvoteState] = useState({ count: 0, isUpvoted: false });
  const [activeImg, setActiveImg] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getIssueById(id);
      if (res.success) {
        setData(res.data);
        setUpvoteState({
          count: res.data.issue.upvoteCount || res.data.issue.upvotes?.length || 0,
          isUpvoted: res.data.isUpvoted || false,
        });
        setActiveImg(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!data?.issue?.checkPending) return undefined;
    let active = true;
    let timer;
    const refreshCheckStatus = async () => {
      try {
        const res = await getIssueById(id);
        if (!active || !res.success) return;
        setData(res.data);
        if (res.data.issue.checkPending) {
          timer = setTimeout(refreshCheckStatus, 1500);
        }
      } catch (pollError) {
        if (active) showError(`Could not refresh background photo checks: ${pollError.message}`);
      }
    };
    timer = setTimeout(refreshCheckStatus, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [data?.issue?.checkPending, id, showError]);

  const onUpvote = async () => {
    if (!isAuthenticated) {
      showError('Please login to upvote');
      return;
    }
    try {
      setUpvoting(true);
      const res = await upvoteIssue(id);
      setUpvoteState({ count: res.data.upvoteCount, isUpvoted: res.data.isUpvoted });
    } catch (err) {
      showError(err.message);
    } finally {
      setUpvoting(false);
    }
  };

  const onSubmitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!isAuthenticated) {
      showError('Please login to comment');
      return;
    }
    try {
      setSubmittingComment(true);
      const res = await addComment(id, comment.trim());
      setData((prev) => ({
        ...prev,
        comments: [...(prev?.comments || []), res.data.comment],
      }));
      setComment('');
      showSuccess('Comment added');
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const canModify = (issue) => {
    if (!issue || !user) return false;
    const reporterId = typeof issue.reportedBy === 'object' ? issue.reportedBy?._id : issue.reportedBy;
    return user.role === 'citizen' &&
      String(reporterId) === String(user._id) &&
      (issue.status === 'submitted' || issue.status === 'reported');
  };

  const onReopen = async () => {
    try {
      setReopening(true);
      const response = await reopenIssue(id);
      setData((current) => ({ ...current, issue: response.data.issue }));
      showSuccess('Report reopened for review.');
    } catch (err) {
      showError(err.message || 'Unable to reopen this report.');
    } finally {
      setReopening(false);
    }
  };

  const onDelete = async () => {
    try {
      setDeleting(true);
      const res = await deleteIssue(id);
      setConfirmDelete(false);
      showSuccess(res.message || 'Issue deleted');
      navigate('/', { replace: true });
    } catch (err) {
      showError(err.message || 'Failed to delete issue');
    } finally {
      setDeleting(false);
    }
  };

  const onUpdated = (updatedIssue) => {
    setData((prev) => ({ ...prev, issue: updatedIssue }));
    showSuccess('Issue updated');
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchIssue} />;
  if (!data)
    return (
      <EmptyState
        icon="warning"
        title="Issue not found"
        description="This issue may have been removed or the link is invalid."
        action={
          <Link to="/">
            <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Feed
            </Button>
          </Link>
        }
      />
    );

  const { issue, comments = [] } = data;
  const [lng, lat] = issue.location?.coordinates || [0, 0];
  const images = issue.images?.filter(Boolean) || [];
  const reporterId = typeof issue.reportedBy === 'object' ? issue.reportedBy?._id : issue.reportedBy;
  const isOwner = user?.role === 'citizen' && String(reporterId) === String(user._id);

  return (
    <>
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-brand-700 hover:text-brand-900 dark:text-paper-200 dark:hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 sm:gap-6">
        {/* Main column */}
        <div className="space-y-5 sm:space-y-6 min-w-0">
          {/* Gallery + title card */}
          <article className="surface !p-0 overflow-hidden">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[16/9] sm:aspect-video bg-paper-100 dark:bg-white/[0.03] overflow-hidden border-b border-paper-200 dark:border-white/10">
                  <img
                    key={activeImg}
                    src={images[activeImg]}
                    alt={`Evidence ${activeImg + 1}`}
                    className="w-full h-full object-cover animate-fade-in"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 items-center justify-center text-paper-300 dark:text-white/30 hidden">
                    <ImageOff className="h-12 w-12" strokeWidth={1.5} />
                  </div>
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImg((i) => (i - 1 + images.length) % images.length)
                        }
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-full bg-white/90 dark:bg-brand-900/90 border border-paper-200 dark:border-white/10 text-brand-800 dark:text-paper-100 shadow-card hover:bg-white dark:hover:bg-brand-900 transition-colors"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-full bg-white/90 dark:bg-brand-900/90 border border-paper-200 dark:border-white/10 text-brand-800 dark:text-paper-100 shadow-card hover:bg-white dark:hover:bg-brand-900 transition-colors"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </button>
                      <div className="absolute right-3 bottom-3 text-[0.7rem] font-semibold tabular bg-brand-950/75 dark:bg-white/80 text-white dark:text-brand-900 px-2 py-0.5 rounded-badge backdrop-blur-sm">
                        {activeImg + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="p-3 sm:p-3.5 bg-paper-50 dark:bg-white/[0.02] border-b border-paper-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 min-w-max">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImg(idx)}
                          aria-label={`View image ${idx + 1}`}
                          className={`shrink-0 h-16 w-24 sm:h-20 sm:w-28 rounded-md-plus overflow-hidden border-2 transition-all ${
                            activeImg === idx
                              ? 'border-brand-800 dark:border-brand-200 shadow-card -translate-y-0.5'
                              : 'border-transparent hover:border-paper-300 dark:hover:border-white/20 opacity-90 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[16/9] sm:aspect-video bg-paper-100 dark:bg-white/[0.03] grid place-items-center text-paper-300 dark:text-white/20 border-b border-paper-200 dark:border-white/10">
                <div className="flex flex-col items-center gap-2">
                  <ImageOff className="h-14 w-14" strokeWidth={1.5} />
                  <p className="text-[0.8rem] font-medium">No evidence photos provided</p>
                </div>
              </div>
            )}

            <div className="p-5 sm:p-7 space-y-4.5">
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} showIcon />
                  <StatusBadge status={issue.status} />
                  <PriorityBadge priority={issue.priority} />
                  {issue.isDuplicateFlag && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.72rem] font-semibold rounded-badge border border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-300">
                      <CopyX className="h-3.5 w-3.5" />
                      Possible Duplicate
                    </span>
                  )}
                </div>
                {issue.underReview && (
                  <Alert
                    tone="info"
                    title="Under review"
                  >
                    {issue.underReviewMessage || 'This report is receiving an additional review. No action is needed from you.'}
                  </Alert>
                )}
                {issue.resolutionPhoto && (
                  <a className="text-sm font-medium text-brand-700 underline dark:text-brand-200" href={issue.resolutionPhoto} target="_blank" rel="noreferrer">
                    View resolution photo
                  </a>
                )}
                {['officer', 'admin'].includes(user?.role) && (
                  <Link to={`/admin/issues/${issue._id}`}>
                    <Button variant="secondary" size="sm">
                      Manage report
                    </Button>
                  </Link>
                )}
                {isOwner && issue.status === 'resolved' && !issue.reopenCount && (
                  <Button onClick={onReopen} loading={reopening} disabled={reopening}>
                    Reopen report
                  </Button>
                )}
                {canModify(issue) && (
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => setEditOpen(true)}
                    >
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                )}
              </div>

              <h1 className="font-display tracking-tightest text-[1.55rem] sm:text-[1.85rem] leading-[1.1] text-brand-950 dark:text-white">
                {issue.title}
              </h1>
              <p className="text-[0.94rem] leading-relaxed text-brand-700/90 dark:text-paper-200 whitespace-pre-line">
                {issue.description}
              </p>

              {/* Info grid */}
              <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3 pt-2 border-t border-paper-200 dark:border-white/10">
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location">
                  <span className="line-clamp-2">{issue.location?.address || 'Attached via map pin'}</span>
                </InfoRow>
                <InfoRow icon={<Navigation2 className="h-4 w-4" />} label="Coordinates">
                  <span className="tabular">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                </InfoRow>
                <InfoRow icon={<User className="h-4 w-4" />} label="Reported By">
                  <span className="font-medium">{issue.reportedByName || 'Anonymous Citizen'}</span>
                </InfoRow>
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Reported">
                  <span className="tabular" title={formatDateTime(issue.createdAt)}>{timeAgo(issue.createdAt)}</span>
                </InfoRow>
                {issue.assignedTo && (
                  <InfoRow icon={<Wrench className="h-4 w-4" />} label="Assigned To">
                    <span>{issue.assignedToName || 'Municipal Team'}</span>
                  </InfoRow>
                )}
                {issue.resolvedAt && (
                  <InfoRow icon={<CheckCheck className="h-4 w-4" />} label="Resolved">
                    <span className="tabular font-medium" title={formatDateTime(issue.resolvedAt)}>{timeAgo(issue.resolvedAt)}</span>
                  </InfoRow>
                )}
              </div>

              {issue.resolutionNote && (
                <Alert tone="success" title="Resolution Note" icon={<FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}>
                  <p className="text-[0.88rem] leading-relaxed">{issue.resolutionNote}</p>
                </Alert>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-paper-200 dark:border-white/10">
                <Button
                  variant={upvoteState.isUpvoted ? 'primary' : 'secondary'}
                  leftIcon={<ThumbsUp className={`h-4 w-4 ${upvoteState.isUpvoted ? 'fill-current' : ''}`} />}
                  onClick={onUpvote}
                  loading={upvoting}
                >
                  {upvoteState.isUpvoted ? 'Upvoted' : 'Upvote'}
                  <span className={`tabular ml-1 px-1.5 py-0.5 rounded-md-plus text-[0.76rem] font-semibold ${upvoteState.isUpvoted ? 'bg-white/20 text-white dark:bg-brand-900/30 dark:text-brand-900' : 'bg-brand-50 text-brand-700 dark:bg-white/10 dark:text-paper-100'}`}>
                    {upvoteState.count}
                  </span>
                </Button>
              </div>
            </div>
          </article>

          {/* Comments */}
          <section className="surface">
            <header className="flex items-center justify-between pb-4 mb-4 border-b border-paper-200 dark:border-white/10">
              <h2 className="font-display tracking-tightest text-[1.05rem] text-brand-950 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-brand-700 dark:text-brand-200" />
                Discussion
                <span className="ml-1 text-[0.78rem] font-semibold tabular px-2 py-0.5 rounded-badge bg-paper-100 dark:bg-white/[0.05] text-brand-700 dark:text-paper-100 border border-paper-200 dark:border-white/10">
                  {comments.length}
                </span>
              </h2>
            </header>

            {isAuthenticated && (
              <form onSubmit={onSubmitComment} className="mb-5">
                <Textarea
                  id="comment-input"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Share an update or ask a question about this issue..."
                  className="!rounded-lg"
                />
                <div className="flex justify-end mt-2.5">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!comment.trim() || submittingComment}
                    loading={submittingComment}
                  >
                    Post Comment
                  </Button>
                </div>
              </form>
            )}

            {comments.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-paper-100 dark:bg-white/[0.04] text-brand-600 dark:text-paper-300 border border-paper-200 dark:border-white/10">
                  <MessageSquare className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <p className="text-[0.88rem] font-medium text-brand-800 dark:text-paper-100 mb-0.5">
                  No comments yet
                </p>
                <p className="text-[0.8rem] text-brand-600/80 dark:text-paper-300">
                  Be the first to share your thoughts or an update.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {comments.map((c) => (
                  <li key={c._id} className="flex gap-3">
                    <Avatar initials={c.userName} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="rounded-lg bg-paper-50 dark:bg-white/[0.03] border border-paper-200 dark:border-white/10 p-3 sm:p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="text-[0.84rem] font-semibold text-brand-900 dark:text-white">
                            {c.userName}
                          </span>
                          <RoleBadge role={c.userRole} size="sm" />
                          <span className="ml-auto text-[0.7rem] tabular font-medium text-brand-600/70 dark:text-paper-300" title={formatDateTime(c.createdAt)}>
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-[0.86rem] leading-relaxed text-brand-800 dark:text-paper-100 whitespace-pre-wrap">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side column - sticky */}
        <div className="space-y-5 sm:space-y-6">
          <div className="lg:sticky lg:top-[154px] space-y-5 sm:space-y-6">
            {/* Map side card */}
            <div className="surface !p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-paper-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-700 dark:text-brand-200" />
                  <h3 className="font-display tracking-tightest text-[0.95rem] text-brand-950 dark:text-white">
                    Location
                  </h3>
                </div>
                <DotBadge status={issue.status} size="sm" />
              </div>
              <div className="h-72 sm:h-80">
                <MapView
                  issues={[issue]}
                  initialCenter={[lat, lng]}
                  initialZoom={15}
                  height="h-full"
                  selectedMarker={{ lat, lng }}
                  className="!border-0 !rounded-none !shadow-none"
                />
              </div>
            </div>

            {/* Timeline */}
            <StatusTimeline issue={issue} />
          </div>
        </div>
      </div>
    </div>
      <IssueEditDialog
        open={editOpen}
        issue={issue}
        onClose={() => setEditOpen(false)}
        onUpdated={onUpdated}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        onConfirm={onDelete}
        danger
        title="Delete this issue?"
        message="This will permanently remove the issue along with its comments and uploaded photos. This cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete Issue'}
        cancelLabel="Cancel"
      />
    </>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="pt-3 flex gap-3 items-start min-w-0">
      <div className="shrink-0 mt-0.5 h-8 w-8 inline-flex items-center justify-center rounded-md-plus bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-200 border border-brand-100 dark:border-brand-500/15">
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-brand-600 dark:text-paper-300 mb-0.5">
          {label}
        </div>
        <div className="text-[0.86rem] text-brand-800 dark:text-paper-100 leading-snug">
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusTimeline({ issue }) {
  const isSubmitted = issue.status === 'submitted' || issue.status === 'reported';
  const isInProgress = issue.status === 'in_progress' || issue.status === 'in-progress';
  const isResolved = issue.status === 'resolved';
  const steps = [
    {
      key: 'submitted',
      label: 'Submitted',
      sub: 'Citizen submitted the report',
      time: issue.createdAt,
      status: 'submitted',
      active: isSubmitted,
      done: true,
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      sub: 'Municipal officer reviewing and investigating',
      time: isInProgress || isResolved ? issue.updatedAt : null,
      status: 'in_progress',
      active: isInProgress,
      done: isInProgress || isResolved,
    },
    {
      key: 'resolved',
      label: 'Resolved',
      sub: 'Issue has been fixed',
      time: issue.resolvedAt,
      status: 'resolved',
      active: isResolved,
      done: isResolved,
      success: true,
    },
  ];
  const showSteps = steps;

  const dotColor = (s) => {
    if (s.done || s.active) {
      if (s.success) return 'bg-emerald-600 dark:bg-emerald-400';
      if (s.status === 'in_progress') return 'bg-amber-500';
      return 'bg-blue-600 dark:bg-blue-400';
    }
    return 'bg-paper-300 dark:bg-white/20';
  };
  const ringColor = (s) =>
    s.active
      ? 'ring-4 ring-brand-500/20 dark:ring-brand-200/30 scale-110'
      : 'ring-4 ring-white dark:ring-brand-900';

  return (
    <div className="surface">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-paper-200 dark:border-white/10">
        <h3 className="font-display tracking-tightest text-[0.95rem] text-brand-950 dark:text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-700 dark:text-brand-200" />
          Status Timeline
        </h3>
        <StatusBadge status={issue.status} size="sm" showIcon={false} />
      </div>

      <ol className="relative ml-2 space-y-4 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-paper-200 dark:before:bg-white/10">
        {showSteps.map((s) => {
          return (
            <li key={s.key} className="relative pl-7">
              <span
                className={`absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full transition-all ${dotColor(s)} ${ringColor(s)}`}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4
                    className={`text-[0.86rem] font-semibold leading-tight ${
                      s.done || s.active
                        ? 'text-brand-900 dark:text-white'
                        : 'text-brand-600/60 dark:text-paper-300/70'
                    }`}
                  >
                    {s.label}
                  </h4>
                  <p
                    className={`mt-0.5 text-[0.76rem] leading-relaxed ${
                      s.done || s.active
                        ? 'text-brand-700/80 dark:text-paper-300'
                        : 'text-brand-600/50 dark:text-paper-300/50'
                    }`}
                  >
                    {s.sub}
                  </p>
                </div>
                {s.time ? (
                  <span
                    className="shrink-0 text-[0.7rem] tabular font-medium text-brand-600/80 dark:text-paper-300 pt-0.5"
                    title={formatDateTime(s.time)}
                  >
                    {timeAgo(s.time)}
                  </span>
                ) : null}
              </div>
              {s.active && (
                <div className="mt-1.5 inline-block">
                  <StatusBadge status={s.status} size="sm" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ArrowLeft, MapPin, Navigation, User, Clock, Wrench, CheckCheck,
  FileText, MessageSquare, CopyX, Hand, CircleDashed, LoaderCircle, CheckCircle2, CircleX,
  ThumbsUp, ImageOff, ChevronRight, AlertTriangle, AlertCircle, Info, CheckCircle, Trash2
} from 'lucide-react';
import {
  getIssueById,
  getIssueUploadToken,
  upvoteIssue,
  addComment,
  deleteIssue,
} from '../services/issueService';
import {
  updateIssueStatus,
  assignIssue,
  flagDuplicate,
  getAuthorityUsers,
  reviewSpam,
} from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MapView from '../components/MapView';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { StatusBadge, PriorityBadge, CategoryBadge, RoleBadge, DotBadge, Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Form';
import { Alert } from '../components/ui/Alert';
import { Avatar } from '../components/ui/Skeleton';
import { formatDateTime, timeAgo } from '../utils/format';
import captureDeviceLocation from '../utils/captureDeviceLocation';

const STATUS_OPTIONS = [
  { key: 'submitted', label: 'Submitted', icon: CircleDashed, active: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/40 ring-2 ring-blue-500/20', idle: 'border-paper-200 dark:border-brand-800 text-paper-600 dark:text-paper-400 hover:bg-blue-50 dark:hover:bg-blue-500/5' },
  { key: 'in_progress', label: 'In Progress', icon: LoaderCircle, active: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40 ring-2 ring-amber-500/20', idle: 'border-paper-200 dark:border-brand-800 text-paper-600 dark:text-paper-400 hover:bg-amber-50 dark:hover:bg-amber-500/5' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/20', idle: 'border-paper-200 dark:border-brand-800 text-paper-600 dark:text-paper-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/5' },
];

const CONFIRM_ICON = {
  submitted: Info,
  in_progress: AlertCircle,
  resolved: CheckCircle,
};

const CONFIRM_TONE = {
  submitted: 'info',
  in_progress: 'warning',
  resolved: 'success',
};

export default function AdminIssueDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState({ comment: false, status: false, assign: false, flag: false, spam: false });
  const [authorityUsers, setAuthorityUsers] = useState([]);
  const [statusDraft, setStatusDraft] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const [resolutionCaptureConsent, setResolutionCaptureConsent] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmSpamDelete, setConfirmSpamDelete] = useState(false);
  const [deletingSpam, setDeletingSpam] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const { showError, showSuccess, showWarn } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [issueRes, usersRes] = await Promise.all([
        getIssueById(id),
        getAuthorityUsers(),
      ]);
      if (issueRes.success) {
        setData(issueRes.data);
        setResolutionNote(issueRes.data.issue.resolutionNote || '');
      }
      if (usersRes.success) setAuthorityUsers(usersRes.data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResolutionCaptureConsent(false);
    setResolutionPhoto(null);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      setSubmitting((s) => ({ ...s, comment: true }));
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
      setSubmitting((s) => ({ ...s, comment: false }));
    }
  };

  const onSelfAssign = async () => {
    try {
      setSubmitting((s) => ({ ...s, assign: true }));
      const res = await assignIssue(id, 'self');
      if (res.success) {
        const assigned = res.data.issue.assignedTo;
        setData((prev) => ({
          ...prev,
          issue: {
            ...prev.issue,
            assignedTo: assigned,
            assignedToName: assigned?.name || user?.name,
          },
        }));
        showSuccess(`Assigned to you`);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting((s) => ({ ...s, assign: false }));
    }
  };

  const onAssignChange = async (e) => {
    const value = e.target.value;
    try {
      setSubmitting((s) => ({ ...s, assign: true }));
      const res = await assignIssue(id, value === 'unassign' ? 'unassign' : value);
      if (res.success) {
        const assigned = res.data.issue.assignedTo;
        const assignedUser = authorityUsers.find((u) =>
          String(u._id) === String(assigned?._id || assigned)
        );
        setData((prev) => ({
          ...prev,
          issue: {
            ...prev.issue,
            assignedTo: assigned,
            assignedToName: assigned?.name || assignedUser?.name || null,
          },
        }));
        showSuccess(assigned ? 'Assigned successfully' : 'Unassigned');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting((s) => ({ ...s, assign: false }));
    }
  };

  const onFlagDuplicate = async () => {
    try {
      setSubmitting((s) => ({ ...s, flag: true }));
      const isDuplicate = !data?.issue.isDuplicateFlag;
      const res = await flagDuplicate(id, { isDuplicate });
      if (res.success) {
        setData((prev) => ({ ...prev, issue: { ...prev.issue, isDuplicateFlag: isDuplicate } }));
        showSuccess(isDuplicate ? 'Flagged as duplicate' : 'Duplicate flag removed');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting((s) => ({ ...s, flag: false }));
    }
  };

  const onFlagSpam = async () => {
    try {
      setSubmitting((previous) => ({ ...previous, spam: true }));
      const response = await reviewSpam(id, {
        decision: 'flag_spam',
        reason: 'Flagged by municipal staff for administrator review',
      });
      setData((previous) => ({ ...previous, issue: response.data.issue }));
      showSuccess('Report flagged for administrator review.');
    } catch (err) {
      showError(err.message || 'Unable to flag this report for spam review.');
    } finally {
      setSubmitting((previous) => ({ ...previous, spam: false }));
    }
  };

  const onDeleteConfirmedSpam = async () => {
    try {
      setDeletingSpam(true);
      const response = await deleteIssue(id);
      showSuccess(response.message || 'Confirmed spam report deleted.');
      navigate('/admin', { replace: true });
    } catch (err) {
      showError(err.message || 'Unable to delete the confirmed spam report.');
    } finally {
      setDeletingSpam(false);
      setConfirmSpamDelete(false);
    }
  };

  const confirmStatusChange = (status) => {
    setStatusDraft(status);
    setConfirm({ status });
  };

  const applyStatusChange = async () => {
    if (!statusDraft) return;
    try {
      setSubmitting((s) => ({ ...s, status: true }));
      if (statusDraft === 'resolved' && !resolutionPhoto) {
        showError('Upload a resolution photo before resolving this report.');
        return;
      }
      const uploadToken = statusDraft === 'resolved' ? (await getIssueUploadToken()).token : null;
      let resolutionCaptureLocation = null;
      if (statusDraft === 'resolved' && resolutionCaptureConsent) {
        try {
          resolutionCaptureLocation = await captureDeviceLocation();
        } catch {
          showWarn('Device location was unavailable; the report can still be resolved.');
        }
      }
      let payload = { status: statusDraft, resolutionNote: resolutionNote.trim() };
      if (statusDraft === 'resolved') {
        payload = new FormData();
        payload.append('status', statusDraft);
        payload.append('resolutionNote', resolutionNote.trim());
        payload.append('resolutionPhoto', resolutionPhoto);
        if (resolutionCaptureLocation) {
          payload.append('captureLocation', JSON.stringify(resolutionCaptureLocation));
        }
      }
      const res = await updateIssueStatus(id, payload, uploadToken);
      if (res.success) {
        setData((prev) => ({
          ...prev,
          issue: {
            ...prev.issue,
            status: res.data.issue.status,
            resolutionNote: res.data.issue.resolutionNote,
            resolvedAt: res.data.issue.resolvedAt,
            resolutionPhoto: res.data.issue.resolutionPhoto,
          },
        }));
        showSuccess(`Status updated to ${statusDraft}`);
        setConfirm(null);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting((s) => ({ ...s, status: false }));
    }
  };

  const confirmMessage = confirm?.status === 'resolved'
    ? 'Mark this issue as resolved. A resolution photo is required and will be visible with the report.'
    : 'Work has started on this report. The citizen will see its updated status.';

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data)
    return (
      <EmptyState
        iconKey="file"
        title="Issue not found"
        action={
          <Link to="/admin">
            <Button variant="primary" size="md">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        }
      />
    );

  const { issue, comments } = data;
  const hasStaffSpamFlag = (issue.spamReasons || []).some((reason) =>
    (typeof reason === 'string' ? reason : reason?.code) === 'staff_flagged_spam'
  );
  const [lng, lat] = issue.location?.coordinates || [0, 0];
  const evidenceMarkers = [
    issue.captureLocation && {
      type: 'device',
      label: 'Device GPS capture',
      lat: Number(issue.captureLocation.lat),
      lng: Number(issue.captureLocation.lng),
    },
    issue.exifLocation && {
      type: 'photo',
      label: 'Photo EXIF location',
      lat: Number(issue.exifLocation.lat),
      lng: Number(issue.exifLocation.lng),
    },
  ].filter((marker) => marker && Number.isFinite(marker.lat) && Number.isFinite(marker.lng));
  const assignedToId = issue.assignedTo?._id || issue.assignedTo;
  const isMine = Boolean(user?._id && assignedToId && String(assignedToId) === String(user._id));
  const isAssignedToAnother = Boolean(assignedToId && !isMine);
  const canUpdateStatus = user?.role === 'admin' || (user?.role === 'officer' && isMine);
  const upvoteCount = issue.upvoteCount || issue.upvotes?.length || 0;

  return (
    <div className="space-y-6">
      <nav className="flex items-start justify-between gap-3 flex-wrap">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-paper-600 dark:text-paper-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>
        <Button
          variant={issue.isDuplicateFlag ? 'primary' : 'secondary'}
          size="sm"
          onClick={onFlagDuplicate}
          loading={submitting.flag}
          disabled={submitting.flag}
          className={issue.isDuplicateFlag ? '!bg-violet-600 !hover:bg-violet-700 !border-violet-600' : ''}
        >
          <CopyX className="h-4 w-4 mr-1.5" />
          {issue.isDuplicateFlag ? 'Duplicate Flagged (undo)' : 'Flag as Duplicate'}
        </Button>
      </nav>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5">
          <Card className="!overflow-hidden">
            {issue.images?.length > 0 ? (
              <>
                <div className="relative aspect-video bg-paper-100 dark:bg-brand-900/40 overflow-hidden">
                  <img src={issue.images[activeImg]} alt={issue.title} className="w-full h-full object-cover" />
                  {issue.images.length > 1 && (
                    <div className="absolute bottom-3 left-3">
                      <Badge tone="bg-black/60 text-white border-white/10 backdrop-blur-sm">
                        {activeImg + 1} / {issue.images.length}
                      </Badge>
                    </div>
                  )}
                </div>
                {issue.images.length > 1 && (
                  <div className="p-3 border-t border-paper-100 dark:border-brand-800 bg-paper-50 dark:bg-brand-900/30 flex gap-2 overflow-x-auto no-scrollbar">
                    {issue.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImg(idx)}
                        className={`shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-all ${
                          activeImg === idx
                            ? 'border-brand-500 shadow-sm scale-[1.02]'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-video bg-paper-50 dark:bg-brand-900/40 grid place-items-center">
                <div className="flex flex-col items-center gap-2 text-paper-400">
                  <ImageOff className="h-12 w-12 opacity-60" />
                  <span className="text-xs">No photos attached</span>
                </div>
              </div>
            )}

            <CardBody className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} />
                <StatusBadge status={issue.status} />
                <PriorityBadge priority={issue.priority} />
                {issue.isDuplicateFlag && (
                  <Badge tone="bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 border-violet-200 dark:border-violet-500/20">
                    <CopyX className="h-3 w-3 mr-1" />
                    Duplicate
                  </Badge>
                )}
              </div>
              {issue.checkStatus === 'pending_check' && (
                <Alert tone="info" title="Automated checks running">This report will enter the staff review queue when image analysis finishes.</Alert>
              )}
              {issue.checkStatus === 'check_failed' && (
                <Alert tone="warning" title="Manual review required">Automated checks failed. This report has not been treated as spam.</Alert>
              )}
              {issue.resolutionReview?.status === 'flagged' && (
                <Alert tone="warning" title="Resolution photo needs review">{(issue.resolutionReview.reasons || []).join(', ')}</Alert>
              )}
              {issue.resolutionReview?.status === 'check_failed' && (
                <Alert tone="warning" title="Resolution photo check failed">The photo is available, but its automated check needs manual review.</Alert>
              )}
              {['suspected', 'confirmed'].includes(issue.spamStatus) && (
                <Alert
                  tone="warning"
                  title={issue.spamStatus === 'confirmed' ? 'Spam confirmed by administrator' : 'Possible spam'}
                >
                  <p>Score {issue.spamScore}/100 · {(issue.spamReasons || []).map((reason) => typeof reason === 'string' ? reason : `${reason.code}: ${reason.text}`).join(', ') || 'Review signals are available.'}</p>
                  {user?.role === 'admin' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        try {
                          const response = await reviewSpam(id, { decision: 'not_spam', reason: 'Reviewed by administrator' });
                          setData((prev) => ({ ...prev, issue: response.data.issue }));
                          showSuccess('Report marked not spam.');
                        } catch (err) { showError(err.message); }
                      }}>Not spam</Button>
                      {issue.spamStatus !== 'confirmed' && (
                        <Button size="sm" variant="danger" onClick={async () => {
                          try {
                            const response = await reviewSpam(id, { decision: 'confirmed_spam', reason: 'Confirmed by administrator' });
                            setData((prev) => ({ ...prev, issue: response.data.issue }));
                            showSuccess('Spam decision recorded.');
                          } catch (err) { showError(err.message); }
                        }}>Confirm spam</Button>
                      )}
                      {issue.spamStatus === 'confirmed' && (
                        <Button size="sm" variant="danger" onClick={() => setConfirmSpamDelete(true)}>
                          <Trash2 className="h-4 w-4 mr-1.5" /> Delete confirmed spam
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm">
                      {issue.spamStatus === 'confirmed' ? (
                        <p>An administrator confirmed this report as spam. Contact an administrator if this needs to be reconsidered.</p>
                      ) : hasStaffSpamFlag ? (
                        <p>Flagged for administrator review. Staff cannot make the final spam decision.</p>
                      ) : (
                        <>
                          <p>Automated checks identified possible spam. You can also flag it for an administrator to review.</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-3"
                            onClick={onFlagSpam}
                            loading={submitting.spam}
                            disabled={submitting.spam}
                          >
                            Flag for admin spam review
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Alert>
              )}
              {user?.role === 'officer' &&
                !['suspected', 'confirmed'].includes(issue.spamStatus) &&
                !hasStaffSpamFlag && (
                <Alert
                  tone="info"
                  title={issue.spamStatus === 'cleared' ? 'Need another spam review?' : 'Report questionable?'}
                >
                  {issue.spamStatus === 'cleared'
                    ? 'An administrator previously marked this report as not spam. If you have new concerns, you can flag it for review again.'
                    : 'Flag it for an administrator to review. A staff flag does not confirm spam or remove the report.'}
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={onFlagSpam}
                      loading={submitting.spam}
                      disabled={submitting.spam}
                    >
                      Flag for admin spam review
                    </Button>
                  </div>
                </Alert>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-brand-900 dark:text-paper-100 leading-tight">
                {issue.title}
              </h1>
              <p className="text-paper-700 dark:text-paper-300 whitespace-pre-line leading-relaxed">
                {issue.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <InfoRow icon={<MapPin className="h-4 w-4" />} tone="brand" label="Address" value={issue.location?.address || '-'} />
                <InfoRow icon={<Navigation className="h-4 w-4" />} tone="accent" label="Coordinates" value={`${lat.toFixed(5)}, ${lng.toFixed(5)}`} />
                <InfoRow icon={<User className="h-4 w-4" />} tone="violet" label="Reported By" value={issue.reportedByName || 'Anonymous'} />
                <InfoRow icon={<Clock className="h-4 w-4" />} tone="amber" label="Reported At" value={formatDateTime(issue.createdAt)} />
                <InfoRow icon={<Wrench className="h-4 w-4" />} tone="blue" label="Assigned To" value={issue.assignedToName ? (isMine ? `${issue.assignedToName} (you)` : issue.assignedToName) : 'Unassigned'} />
                {issue.resolvedAt && (
                  <InfoRow icon={<CheckCheck className="h-4 w-4" />} tone="emerald" label="Resolved At" value={formatDateTime(issue.resolvedAt)} />
                )}
                {issue.captureLocation && (
                  <InfoRow icon={<Navigation className="h-4 w-4" />} tone="amber" label="Device GPS coordinates" value={`${issue.captureLocation.lat}, ${issue.captureLocation.lng}${issue.captureLocation.accuracy ? ` (±${Math.round(issue.captureLocation.accuracy)}m)` : ''}`} />
                )}
                {issue.captureLocation?.capturedAt && (
                  <InfoRow icon={<Clock className="h-4 w-4" />} tone="amber" label="Device GPS capture time" value={formatDateTime(issue.captureLocation.capturedAt)} />
                )}
                {issue.exifLocation && (
                  <InfoRow icon={<Navigation className="h-4 w-4" />} tone="violet" label="Photo EXIF location" value={`${issue.exifLocation.lat}, ${issue.exifLocation.lng}`} />
                )}
                {issue.exifTakenAt && (
                  <InfoRow icon={<Clock className="h-4 w-4" />} tone="violet" label="Photo EXIF capture time" value={formatDateTime(issue.exifTakenAt)} />
                )}
                {issue.locationDistances && (
                  <InfoRow icon={<Navigation className="h-4 w-4" />} tone="blue" label="Device GPS / photo EXIF distance from pin" value={`${issue.locationDistances.deviceToPinMeters == null ? '—' : `${Math.round(issue.locationDistances.deviceToPinMeters)}m`} / ${issue.locationDistances.exifToPinMeters == null ? '—' : `${Math.round(issue.locationDistances.exifToPinMeters)}m`}`} />
                )}
                {issue.resolutionReview?.captureLocation && (
                  <InfoRow icon={<Navigation className="h-4 w-4" />} tone="amber" label="Resolution capture location" value={`${issue.resolutionReview.captureLocation.lat}, ${issue.resolutionReview.captureLocation.lng}`} />
                )}
                {issue.resolutionReview?.exifLocation && (
                  <InfoRow icon={<Navigation className="h-4 w-4" />} tone="violet" label="Resolution photo EXIF location" value={`${issue.resolutionReview.exifLocation.lat}, ${issue.resolutionReview.exifLocation.lng}`} />
                )}
                {issue.resolutionReview && (
                  <InfoRow icon={<Navigation className="h-4 w-4" />} tone="blue" label="Resolution photo distances from pin" value={`${issue.resolutionReview.deviceDistanceFromPinMeters == null ? '—' : `${Math.round(issue.resolutionReview.deviceDistanceFromPinMeters)}m`} / ${issue.resolutionReview.distanceFromPinMeters == null ? '—' : `${Math.round(issue.resolutionReview.distanceFromPinMeters)}m`}`} />
                )}
              </div>

              {issue.resolutionNote && (
                <Alert
                  tone="success"
                  icon={<FileText className="h-4 w-4" />}
                  title="Resolution Note"
                  description={issue.resolutionNote}
                />
              )}
              {issue.resolutionPhoto && (
                <a className="text-sm font-medium text-brand-700 underline dark:text-brand-200" href={issue.resolutionPhoto} target="_blank" rel="noreferrer">
                  View resolution photo
                </a>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <CardTitle eyebrow="02">
                  Comments <span className="text-paper-500 dark:text-paper-400 font-normal text-sm">({comments.length})</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <form onSubmit={onSubmitComment} className="space-y-2">
                <Textarea
                  label=""
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add an internal or public update on this issue..."
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!comment.trim() || submitting.comment}
                    loading={submitting.comment}
                  >
                    Post Comment
                  </Button>
                </div>
              </form>

              {comments.length === 0 ? (
                <div className="py-8 text-center">
                  <EmptyState
                    iconKey="inbox"
                    title="No comments yet"
                    description="Be the first to add a status update or note."
                    compact
                  />
                </div>
              ) : (
                <ul className="space-y-4">
                  {comments.map((c) => (
                    <li key={c._id} className="flex gap-3">
                      <Avatar name={c.userName || 'User'} size="sm" tone="brand" />
                      <div className="flex-1 rounded-md-plus bg-paper-50 dark:bg-brand-900/40 p-3 border border-paper-200/60 dark:border-brand-800">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-semibold text-brand-900 dark:text-paper-100 text-sm">{c.userName}</span>
                          <RoleBadge role={c.userRole} size="sm" />
                          <span className="text-[11px] text-paper-500 dark:text-paper-400 ml-auto tabular">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-paper-700 dark:text-paper-300 leading-relaxed">{c.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="sticky top-24">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                <CardTitle eyebrow="01">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <label className="label">Assignment</label>
                <div className="mt-1.5 space-y-2">
                  {user?.role === 'admin' ? (
                    <div className="relative">
                      <select
                        value={assignedToId || 'unassign'}
                        onChange={onAssignChange}
                        disabled={submitting.assign}
                        className="input-base w-full appearance-none bg-white dark:bg-brand-900 pr-9 text-sm"
                      >
                        <option value="unassign">— Unassigned —</option>
                        {authorityUsers.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-paper-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={onSelfAssign}
                        loading={submitting.assign}
                        disabled={submitting.assign || isMine || isAssignedToAnother}
                      >
                        <Hand className="h-4 w-4 mr-1.5" />
                        {isMine ? 'Assigned to you' : isAssignedToAnother ? 'Assigned to another authority user' : 'Assign to me'}
                      </Button>
                      {isAssignedToAnother && (
                        <p className="text-xs text-paper-500 dark:text-paper-400">
                          Ask an administrator to reassign this report before taking it.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {canUpdateStatus && (
              <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Update Report Status</label>
                  <DotBadge tone={['submitted', 'reported'].includes(issue.status) ? 'bg-blue-600' : ['in_progress', 'in-progress'].includes(issue.status) ? 'bg-amber-500' : 'bg-emerald-600'} />
                </div>
                <p className="mb-2 text-xs text-paper-500 dark:text-paper-400">
                  Start work with In Progress. Once work is complete, attach the required resolution photo and mark Resolved.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = opt.key === 'submitted'
                      ? ['submitted', 'reported'].includes(issue.status)
                      : opt.key === 'in_progress'
                        ? ['in_progress', 'in-progress'].includes(issue.status)
                        : issue.status === opt.key;
                    const Icon = opt.icon;
                    const allowedNext = ['submitted', 'reported'].includes(issue.status)
                      ? opt.key === 'in_progress'
                      : ['in_progress', 'in-progress'].includes(issue.status) && opt.key === 'resolved';
                    const isDisabled = isActive || !allowedNext;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => !isDisabled && confirmStatusChange(opt.key)}
                        disabled={isDisabled || submitting.status}
                        className={`relative px-2.5 py-2 rounded-md-plus text-[11px] font-medium border transition-all flex items-center justify-center gap-1.5 ${
                          isActive ? opt.active : opt.idle
                        } ${isDisabled ? 'opacity-80 cursor-default' : ''}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${opt.key === 'in_progress' && !isActive ? '' : opt.key === 'in_progress' ? 'animate-spin' : ''}`} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-paper-400" />
                  Resolution Note
                </label>
                <div className="mt-1.5">
                  <textarea
                    rows={4}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Describe the work completed. Saved when you update the status."
                    className="input-base w-full resize-none text-sm"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-paper-500 dark:text-paper-400">
                  Visible to the citizen when the report is resolved.
                </p>
                {issue.status === 'in_progress' && (
                  <label className="label block mt-3">
                    Resolution photo (required to resolve)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={(event) => setResolutionPhoto(event.target.files?.[0] || null)}
                      className="input-base block w-full mt-1.5 text-sm"
                    />
                  </label>
                )}
                {issue.status === 'in_progress' && (
                  <label className="flex items-start gap-2 mt-3 text-xs text-paper-600 dark:text-paper-400">
                    <input
                      type="checkbox"
                      checked={resolutionCaptureConsent}
                      onChange={(event) => setResolutionCaptureConsent(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Optionally compare this device's GPS with the report pin when resolving. Location
                      permission is requested only when you submit the resolution, and the signal is
                      available to staff only.
                    </span>
                  </label>
                )}
              </div>
              </>
              )}
              {user?.role === 'officer' && !isMine && (
                <p className="text-sm text-paper-600 dark:text-paper-400">
                  Assign this report to yourself before updating its status.
                </p>
              )}

              <div className="pt-4 border-t border-paper-100 dark:border-brand-800 text-[11px] text-paper-500 dark:text-paper-400 space-y-1.5 tabular">
                <div className="flex items-center justify-between">
                  <span className="text-paper-500 dark:text-paper-400">Created</span>
                  <span className="text-paper-600 dark:text-paper-300">{formatDateTime(issue.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-paper-500 dark:text-paper-400">Last updated</span>
                  <span className="text-paper-600 dark:text-paper-300">{timeAgo(issue.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-paper-500 dark:text-paper-400">
                    <ThumbsUp className="h-3 w-3" />
                    Upvotes
                  </span>
                  <span className="text-paper-600 dark:text-paper-300">{upvoteCount}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="!overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <CardTitle eyebrow="03">Location</CardTitle>
              </div>
            </CardHeader>
            <div className="h-72 border-t border-paper-100 dark:border-brand-800">
              <MapView
                issues={[issue]}
                initialCenter={[lat, lng]}
                initialZoom={15}
                height="h-full"
                selectedMarker={{ lat, lng }}
                evidenceMarkers={evidenceMarkers}
              />
            </div>
            <div className="border-t border-paper-100 dark:border-brand-800 px-4 py-3 space-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper-600 dark:text-paper-300">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-700" /> Sender-selected report pin</span>
                {issue.captureLocation && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Device GPS</span>}
                {issue.exifLocation && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-600" /> Photo EXIF</span>}
              </div>
              <p className="text-xs text-paper-500 dark:text-paper-400">
                Reporter GPS is collected once at report submission only when the reporter opts in. GPS
                and photo metadata can be missing or altered; treat distance differences as review
                signals, not proof of fraud.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={`Change status to ${confirm?.status === 'in_progress' ? 'In Progress' : confirm?.status || ''}?`}
        message={confirmMessage}
        confirmLabel={`Update to ${confirm?.status === 'in_progress' ? 'In Progress' : confirm?.status || ''}`}
        icon={confirm?.status ? CONFIRM_ICON[confirm.status] : Info}
        tone={confirm?.status ? CONFIRM_TONE[confirm.status] : 'info'}
        onCancel={() => setConfirm(null)}
        onConfirm={applyStatusChange}
        danger={false}
        loading={submitting.status}
      />
      <ConfirmDialog
        open={confirmSpamDelete}
        title="Delete confirmed spam report?"
        message="This permanently removes the confirmed spam report, its comments, and uploaded photos. This cannot be undone."
        confirmLabel={deletingSpam ? 'Deleting…' : 'Delete report'}
        cancelLabel="Cancel"
        danger
        onCancel={() => !deletingSpam && setConfirmSpamDelete(false)}
        onConfirm={onDeleteConfirmedSpam}
        loading={deletingSpam}
      />
    </div>
  );
}

function InfoRow({ icon, label, value, tone = 'brand' }) {
  const tile = {
    brand: 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
    accent: 'bg-accent-500/10 text-accent-700 dark:text-accent-300',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  }[tone] || 'bg-paper-100 text-paper-600';

  return (
    <div className="flex gap-3 items-start">
      <div className={`h-9 w-9 shrink-0 rounded-lg ${tile} grid place-items-center`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider font-medium text-paper-500 dark:text-paper-400 mb-0.5">
          {label}
        </div>
        <div className="text-sm font-medium text-brand-900 dark:text-paper-200 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

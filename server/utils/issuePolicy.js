const isOfficer = (role) => role === 'officer' || role === 'admin';
const isAdmin = (role) => role === 'admin';
const isSubmitted = (status) => status === 'submitted' || status === 'reported';

const canEditIssue = (user, issue) =>
  Boolean(user && issue &&
    user.role === 'citizen' &&
    String(issue.reportedBy) === String(user._id) &&
    isSubmitted(issue.status));

const canDeleteIssue = (user, issue) =>
  Boolean(user && issue && (
    (isAdmin(user.role) && issue.spamStatus === 'confirmed') ||
    (user.role === 'citizen' &&
      String(issue.reportedBy) === String(user._id) &&
      isSubmitted(issue.status))
  ));

const canTransitionStatus = (current, next) => {
  const from = current === 'reported' ? 'submitted' : current === 'in-progress' ? 'in_progress' : current;
  const to = next === 'reported' ? 'submitted' : next === 'in-progress' ? 'in_progress' : next;
  return (from === 'submitted' && to === 'in_progress') ||
    (from === 'in_progress' && to === 'resolved');
};
const canResolveIssue = (current, next, hasResolutionPhoto) =>
  canTransitionStatus(current, next) && (next !== 'resolved' || Boolean(hasResolutionPhoto));
const canUpdateIssueStatus = (user, issue) => {
  if (!user || !issue) return false;
  if (user.role === 'admin') return true;
  const assigneeId = issue.assignedTo?._id || issue.assignedTo;
  return user.role === 'officer' &&
    assigneeId != null &&
    String(assigneeId) === String(user._id);
};
const canAssignIssueTo = (user, assigneeId) =>
  Boolean(user && (
    user.role === 'admin' ||
    (user.role === 'officer' && String(assigneeId) === String(user._id))
  ));
const canReviewSpam = (role, decision) =>
  (decision === 'flag_spam' && role === 'officer') ||
  (['not_spam', 'confirmed_spam'].includes(decision) && role === 'admin');
const canFlagSpam = (issue) => Boolean(issue && issue.spamStatus !== 'confirmed');
const canReopenIssue = (user, issue) =>
  Boolean(user && issue &&
    user.role === 'citizen' &&
    String(issue.reportedBy) === String(user._id) &&
    issue.status === 'resolved' &&
    (issue.reopenCount || 0) < 1);

const isSuspended = (user) => Boolean(user && user.isActive === false);

module.exports = {
  isOfficer,
  isAdmin,
  isSubmitted,
  canEditIssue,
  canDeleteIssue,
  canTransitionStatus,
  canResolveIssue,
  canUpdateIssueStatus,
  canAssignIssueTo,
  canReviewSpam,
  canFlagSpam,
  canReopenIssue,
  isSuspended,
};

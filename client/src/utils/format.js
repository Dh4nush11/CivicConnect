export const formatDate = (date, opts = {}) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
};

export const formatDateTime = (date) =>
  formatDate(date, { hour: '2-digit', minute: '2-digit' });

export const timeAgo = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
};

export const CATEGORY_LABELS = {
  all: 'All Categories',
  pothole: 'Pothole',
  garbage: 'Garbage',
  streetlight: 'Streetlight',
  water: 'Water Leak',
  sewage: 'Sewage',
  other: 'Other',
};

export const STATUS_LABELS = {
  all: 'All Statuses',
  submitted: 'Submitted',
  reported: 'Submitted',
  in_progress: 'In Progress',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
};

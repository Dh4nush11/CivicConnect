import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { getSpamQueue } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return 'Not available';
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
};

export default function AdminSpamQueuePage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();
  useEffect(() => {
    getSpamQueue()
      .then((response) => setIssues(response.data.issues))
      .catch((error) => showError(error.message || 'Unable to load the spam queue.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-center gap-3">
        <div><h1 className="text-2xl font-bold font-display text-brand-900 dark:text-paper-100">Spam review queue</h1><p className="text-sm text-paper-600 dark:text-paper-400">Signals are for staff review; they never delete reports automatically.</p></div>
        <Link to="/admin"><Button variant="secondary">Back to dashboard</Button></Link>
      </header>
      {loading ? <p>Loading queue…</p> : issues.length ? (
        <ul className="space-y-3">{issues.map((issue) => (
          <li key={issue._id} className="surface flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <strong>{issue.title}</strong>
              <p className="text-sm text-paper-600 dark:text-paper-400">
                {issue.reportedBy?.email} · Score {issue.spamScore}/100 · {(issue.spamReasons || []).map((reason) => typeof reason === 'string' ? reason : `${reason.code}: ${reason.text}`).join(', ')}
              </p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md-plus border border-paper-200 dark:border-brand-800 p-3">
                  <p className="flex items-center gap-1.5 font-semibold text-brand-800 dark:text-paper-200">
                    <MapPin className="h-3.5 w-3.5" /> Reporter-selected pin
                  </p>
                  <p className="mt-1 text-paper-600 dark:text-paper-400">{issue.location?.address || 'No address provided'}</p>
                  {issue.location?.coordinates?.length === 2 && (
                    <p className="text-xs tabular text-paper-500 dark:text-paper-400">
                      {issue.location.coordinates[1].toFixed(5)}, {issue.location.coordinates[0].toFixed(5)}
                    </p>
                  )}
                </div>
                <div className="rounded-md-plus border border-paper-200 dark:border-brand-800 p-3">
                  <p className="flex items-center gap-1.5 font-semibold text-brand-800 dark:text-paper-200">
                    <Navigation className="h-3.5 w-3.5" /> Location checks vs pin
                  </p>
                  <p className="mt-1 text-paper-600 dark:text-paper-400">
                    Device GPS: {issue.captureLocation
                      ? `${Number(issue.captureLocation.lat).toFixed(5)}, ${Number(issue.captureLocation.lng).toFixed(5)} · ${formatDistance(issue.locationDistances?.deviceToPinMeters)} from pin`
                      : 'Not shared / unavailable'}
                  </p>
                  <p className="text-paper-600 dark:text-paper-400">
                    Photo EXIF: {issue.exifLocation
                      ? `${Number(issue.exifLocation.lat).toFixed(5)}, ${Number(issue.exifLocation.lng).toFixed(5)} · ${formatDistance(issue.locationDistances?.exifToPinMeters)} from pin`
                      : 'No EXIF location available'}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-paper-500 dark:text-paper-400">
                The address and pin are reporter-selected. Device GPS is optional; missing or distant
                signals are review clues, not proof of fraud.
              </p>
            </div>
            <Link to={`/admin/issues/${issue._id}`}><Button size="sm">Review report</Button></Link>
          </li>
        ))}</ul>
      ) : <div className="surface">No suspected or confirmed reports in the queue.</div>}
    </div>
  );
}

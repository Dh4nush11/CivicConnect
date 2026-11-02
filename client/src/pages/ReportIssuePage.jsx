import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, AlertTriangle, Upload, X, Navigation, Send, FileImage, CircleAlert } from 'lucide-react';
import { createIssue, getIssueUploadToken, getNearbyDuplicates } from '../services/issueService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MapView from '../components/MapView';
import Loader from '../components/Loader';
import IssueCard from '../components/IssueCard';
import { Alert } from '../components/ui/Alert';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Input, Textarea, Select } from '../components/ui/Form';
import { Badge, PriorityBadge, CategoryBadge, DotBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CATEGORY_LABELS } from '../utils/format';
import captureDeviceLocation from '../utils/captureDeviceLocation';
import { INDORE_CENTER, INDORE_MAP_ZOOM } from '../constants/location';

const CATEGORIES = ['pothole', 'garbage', 'streetlight', 'water', 'sewage', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];

const PRIORITY_STYLES = {
  low: {
    active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/20 ring-2 ring-emerald-500/20',
    idle: 'border-paper-200 dark:border-brand-800 text-paper-600 dark:text-paper-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/5',
  },
  medium: {
    active: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/20 ring-2 ring-amber-500/20',
    idle: 'border-paper-200 dark:border-brand-800 text-paper-600 dark:text-paper-400 hover:bg-amber-50 dark:hover:bg-amber-500/5',
  },
  high: {
    active: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 dark:border-rose-500/20 ring-2 ring-rose-500/20',
    idle: 'border-paper-200 dark:border-brand-800 text-paper-600 dark:text-paper-400 hover:bg-rose-50 dark:hover:bg-rose-500/5',
  },
};

export default function ReportIssuePage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'pothole',
    categoryDetails: '',
    priority: 'medium',
    address: '',
  });
  const [files, setFiles] = useState([]);
  const [uploadToken, setUploadToken] = useState('');
  const [captureConsent, setCaptureConsent] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [location, setLocation] = useState({
    lat: INDORE_CENTER[0],
    lng: INDORE_CENTER[1],
    picked: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [possibleDupes, setPossibleDupes] = useState([]);
  const [showDupes, setShowDupes] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showError, showSuccess, showWarn } = useToast();

  useEffect(() => {
    let active = true;
    getIssueUploadToken()
      .then(({ token }) => {
        if (active) setUploadToken(token);
      })
      .catch(() => {
        if (active) setErrors((previous) => ({
          ...previous,
          upload: 'Could not start a secure photo upload session. Reload the page and try again.',
        }));
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => Object.fromEntries(CATEGORIES.map(c => [c, CATEGORY_LABELS[c] || c])),
    []
  );

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length > 100) e.title = 'Max 100 characters';
    if (!form.description.trim()) e.description = 'Description is required';
    if (form.category === 'other' && !form.categoryDetails.trim()) {
      e.categoryDetails = 'Please specify the issue category';
    } else if (form.categoryDetails.length > 80) {
      e.categoryDetails = 'Max 80 characters';
    }
    if (!location.picked) e.location = 'Click on the map to select a location';
    if (!form.address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onPickLocation = async (lat, lng) => {
    setLocation({ lat, lng, picked: true });
    try {
      setGeocoding(true);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CivicConnect/1.0' } });
      if (res.ok) {
        const json = await res.json();
        const addr = json.display_name || '';
        setForm((f) => ({ ...f, address: addr }));
      }
    } catch (err) {
      // silent fail - user can type address manually
    } finally {
      setGeocoding(false);
    }

    try {
      const dupesRes = await getNearbyDuplicates({
        category: form.category,
        lat,
        lng,
        radius: 50,
      });
      if (dupesRes.success && dupesRes.data.duplicates.length > 0) {
        setPossibleDupes(dupesRes.data.duplicates);
        setShowDupes(true);
        showWarn(`Found ${dupesRes.data.duplicates.length} similar issue(s) nearby.`);
      } else {
        setPossibleDupes([]);
        setShowDupes(false);
      }
    } catch {
      /* ignore */
    }
  };

  const processFiles = (fileList) => {
    const selected = Array.from(fileList || []);
    const overLimit = selected.length > 5;
    const usable = overLimit ? selected.slice(0, 5) : selected;
    if (overLimit) showWarn('Only 5 images allowed. First 5 selected.');

    const maxSize = 5 * 1024 * 1024;
    const valid = usable.filter((f) => f.size <= maxSize);
    if (valid.length < usable.length) showWarn('Some files exceeded 5MB and were skipped.');

    setFiles(valid);
    setPreviews(valid.map((f) => URL.createObjectURL(f)));
  };

  const onFilesSelected = (ev) => {
    processFiles(ev.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (ev) => {
    ev.preventDefault();
    setDragOver(false);
    const dt = ev.dataTransfer;
    if (dt && dt.files) {
      processFiles(dt.files);
    }
  };

  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setFiles((f) => f.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      if (!uploadToken) throw new Error('Secure photo upload is not ready. Reload the page and try again.');
      let captureLocation = null;
      if (captureConsent) {
        try {
          captureLocation = await captureDeviceLocation();
        } catch {
          showWarn('Device location was unavailable. The report can still be submitted without it.');
        }
      }
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category', form.category);
      if (form.category === 'other') fd.append('categoryDetails', form.categoryDetails.trim());
      fd.append('priority', form.priority);
      fd.append('address', form.address.trim());
      fd.append('lat', String(location.lat));
      fd.append('lng', String(location.lng));
      if (captureLocation) fd.append('captureLocation', JSON.stringify(captureLocation));
      files.forEach((f) => fd.append('images', f));

      const res = await createIssue(fd, uploadToken);
      showSuccess(res.message || 'Issue reported successfully!');
      navigate(`/issues/${res.data.issue._id}`, { replace: true });
    } catch (err) {
      showError(err.message || 'Failed to submit the report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge tone="bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300 border-accent-200 dark:border-accent-500/20">
              <FileImage className="h-3.5 w-3.5 mr-1" />
              New Report
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-brand-900 dark:text-paper-100">
            Report an Issue
            <span className="block h-1 w-16 mt-2 rounded-full bg-accent-500" />
          </h1>
          <p className="text-paper-600 dark:text-paper-400 mt-2 text-sm max-w-xl">
            Fill in the details, add photos, and mark the location on the map. Reports are reviewed within 24 hours.
          </p>
        </div>
      </header>

      {showDupes && possibleDupes.length > 0 && (
        <Alert
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
          title={`${possibleDupes.length} possible duplicate${possibleDupes.length > 1 ? 's' : ''} found nearby`}
          description="These issues were reported within ~50m and same category. Review before submitting."
          dismissible
          onDismiss={() => setShowDupes(false)}
        >
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {possibleDupes.map((issue) => (
              <IssueCard key={issue._id} issue={issue} compact />
            ))}
          </div>
        </Alert>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle eyebrow="01">Basic Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Input
                label="Title"
                required
                value={form.title}
                maxLength={100}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Large pothole near railway station"
                error={errors.title}
                hint={`${form.title.length}/100`}
              />
              <Textarea
                label="Description"
                required
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue, including nearby landmarks, danger level, etc."
                error={errors.description}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle eyebrow="02">Category & Priority</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <div className="relative mt-1.5">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({
                        ...form,
                        category: e.target.value,
                        categoryDetails: e.target.value === 'other' ? form.categoryDetails : '',
                      })}
                      className="input-base w-full appearance-none bg-white dark:bg-brand-900 pr-9"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {categories[c]}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-paper-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                  </div>
                  <div className="mt-2">
                    <CategoryBadge category={form.category} categoryDetails={form.categoryDetails} />
                  </div>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {PRIORITIES.map((p) => {
                      const active = form.priority === p;
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setForm({ ...form, priority: p })}
                          className={`px-3 py-2.5 rounded-md-plus text-sm font-medium capitalize border transition-all ${
                            active ? PRIORITY_STYLES[p].active : PRIORITY_STYLES[p].idle
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2">
                    <PriorityBadge priority={form.priority} />
                  </div>
                </div>
              </div>
              {form.category === 'other' && (
                <Input
                  label="Specify the issue category"
                  required
                  value={form.categoryDetails}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, categoryDetails: e.target.value })}
                  placeholder="e.g. Damaged public bench"
                  error={errors.categoryDetails}
                  hint={`${form.categoryDetails.length}/80`}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle eyebrow="03">Evidence</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <label className="flex items-start gap-2.5 rounded-md-plus border border-paper-200 dark:border-brand-800 p-3 text-sm text-paper-700 dark:text-paper-300">
                <input
                  type="checkbox"
                  checked={captureConsent}
                  onChange={(event) => setCaptureConsent(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  When I submit this report, allow CivicConnect to collect my device GPS once and
                  compare it with the map pin as an optional spam-review signal. Your browser will
                  ask for location permission only after you submit. This records your device location
                  at submission, not verified proof of where a photo was taken. Only municipal
                  officers and administrators can see it; it is never shown publicly.
                </span>
              </label>
              {errors.upload && <Alert tone="error" title="Secure upload unavailable">{errors.upload}</Alert>}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-md-plus border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/5 dark:border-brand-500/50'
                    : files.length
                    ? 'border-brand-300 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5'
                    : 'border-paper-200 dark:border-brand-800 hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-paper-50 dark:hover:bg-brand-500/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onFilesSelected}
                />
                {previews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {previews.map((p, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-paper-200 dark:border-brand-800 group">
                        <img src={p} className="w-full h-full object-cover" alt={`preview-${idx}`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-md bg-white/90 dark:bg-brand-900/90 text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-1.5 left-1.5">
                          <Badge tone="bg-white/90 dark:bg-brand-900/90 text-paper-700 dark:text-paper-200 border-paper-200 dark:border-brand-700 !py-0.5 text-[10px]">
                            {files[idx]?.size ? `${(files[idx].size / 1024 / 1024).toFixed(1)} MB` : ''}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {previews.length < 5 && (
                      <div className="aspect-square rounded-lg border border-dashed border-paper-200 dark:border-brand-800 flex flex-col items-center justify-center text-paper-400 gap-1.5">
                        <Upload className="h-4 w-4" />
                        <span className="text-[11px]">Add more</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-paper-500 dark:text-paper-400">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      dragOver ? 'bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'bg-paper-100 dark:bg-brand-800'
                    }`}>
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-brand-700 dark:text-brand-300">Capture issue photos</span>
                      <span className="mx-1">or</span>
                      <span>drag and drop</span>
                    </div>
                    <p className="text-xs">PNG, JPG up to 5MB each · Max 5 images</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="sticky bottom-4 z-10">
            <div className="surface rounded-md-plus p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-paper-500 dark:text-paper-400">
                <DotBadge tone={submitting ? 'bg-amber-500' : 'bg-emerald-500'} />
                {submitting ? 'Submitting your report...' : 'Ready when you are'}
              </div>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                loading={submitting}
                variant="accent"
                size="md"
                className="min-w-[180px]"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Submit Report
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card className="sticky top-24">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                      04
                    </span>
                    <DotBadge tone={location.picked ? 'bg-emerald-500' : errors.location ? 'bg-rose-500' : 'bg-amber-500'} />
                  </div>
                  <h3 className="font-semibold font-display text-base text-brand-900 dark:text-paper-100">
                    Location
                  </h3>
                  <p className="text-xs text-paper-500 dark:text-paper-400 mt-0.5">
                    {location.picked ? 'Click elsewhere to reposition' : 'Click on map to place pin'}
                  </p>
                </div>
                {geocoding && <Loader size="sm" />}
              </div>
            </CardHeader>
            <div className="relative">
              <div className="h-80 sm:h-96 border-y border-paper-100 dark:border-brand-800">
                <MapView
                  issues={possibleDupes}
                  initialCenter={INDORE_CENTER}
                  initialZoom={INDORE_MAP_ZOOM}
                  onPickLocation={onPickLocation}
                  picking={true}
                  selectedMarker={location.picked ? location : null}
                  height="h-full"
                />
              </div>
            </div>
            <CardBody className="space-y-4">
              <Textarea
                label="Full Address"
                required
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Auto-filled from map, but you can refine it"
                error={errors.address || errors.location}
              />
              {location.picked && (
                <div className="flex items-center gap-2 text-xs text-paper-600 dark:text-paper-400 rounded-md-plus bg-paper-50 dark:bg-brand-800/60 px-3 py-2 border border-paper-200 dark:border-brand-800">
                  <Navigation className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  <span className="tabular">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
                </div>
              )}
              {!location.picked && (
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 rounded-md-plus bg-amber-50 dark:bg-amber-500/10 px-3 py-2 border border-amber-200/60 dark:border-amber-500/20">
                  <CircleAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Select a location on the map to continue.</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

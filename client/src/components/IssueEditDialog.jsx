import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, Camera, Send, MapPin, Navigation, CircleAlert } from 'lucide-react';
import { Modal, ModalFooter } from '../components/ui/Misc';
import { Input, Textarea, Select } from '../components/ui/Form';
import { Button } from '../components/ui/Button';
import { Badge, PriorityBadge, CategoryBadge } from '../components/ui/Badge';
import MapView from './MapView';
import { CATEGORY_LABELS } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { getIssueUploadToken, updateIssue } from '../services/issueService';
import captureDeviceLocation from '../utils/captureDeviceLocation';
import { INDORE_CENTER } from '../constants/location';

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

export default function IssueEditDialog({ open, issue, onClose, onUpdated }) {
  const { showError, showSuccess, showWarn } = useToast();
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'pothole',
    categoryDetails: '',
    priority: 'medium',
    address: '',
  });
  const [location, setLocation] = useState({ lat: 0, lng: 0, picked: false });
  const [initialImages, setInitialImages] = useState([]);
  const [removedImages, setRemovedImages] = useState(new Set());
  const [newFiles, setNewFiles] = useState([]);
  const [captureConsent, setCaptureConsent] = useState(false);
  const [newPreviews, setNewPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const categories = useMemo(
    () => Object.fromEntries(CATEGORIES.map(c => [c, CATEGORY_LABELS[c] || c])),
    []
  );

  useEffect(() => {
    if (issue && open) {
      setForm({
        title: issue.title || '',
        description: issue.description || '',
        category: issue.category || 'pothole',
        categoryDetails: issue.categoryDetails || '',
        priority: issue.priority || 'medium',
        address: issue.location?.address || '',
      });
      const [lng, lat] = issue.location?.coordinates || [0, 0];
      setLocation({ lat, lng, picked: Boolean(lat || lng) });
      setInitialImages(issue.images || []);
      setRemovedImages(new Set());
      setNewFiles([]);
      setCaptureConsent(false);
      setNewPreviews([]);
      setErrors({});
    }
  }, [issue, open]);

  if (!open) return null;

  const onPickLocation = (lat, lng) => {
    setLocation({ lat, lng, picked: true });
  };

  const processFiles = (fileList) => {
    const remainingSlots = 5 - (initialImages.length - removedImages.size) - newFiles.length;
    if (remainingSlots <= 0) {
      showWarn('Maximum 5 images allowed');
      return;
    }
    const selected = Array.from(fileList || []).slice(0, remainingSlots);
    const maxSize = 5 * 1024 * 1024;
    const valid = selected.filter((f) => f.size <= maxSize);
    if (valid.length < selected.length) showWarn('Some files exceeded 5MB and were skipped.');
    setNewFiles((f) => [...f, ...valid]);
    setNewPreviews((p) => [...p, ...valid.map((f) => URL.createObjectURL(f))]);
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

  const removeNewFile = (idx) => {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((f) => f.filter((_, i) => i !== idx));
    setNewPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const toggleRemoveInitial = (src) => {
    setRemovedImages((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

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
    if (!location.picked) e.location = 'Location is required';
    if (!form.address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate() || !issue) return;
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category', form.category);
      if (form.category === 'other') fd.append('categoryDetails', form.categoryDetails.trim());
      fd.append('priority', form.priority);
      fd.append('address', form.address.trim());
      if (location.picked) {
        fd.append('lat', String(location.lat));
        fd.append('lng', String(location.lng));
      }
      if (removedImages.size > 0) {
        Array.from(removedImages).forEach((src) => fd.append('removeImages', src));
      }
      newFiles.forEach((f) => fd.append('images', f));

      const uploadToken = newFiles.length ? (await getIssueUploadToken()).token : null;
      if (captureConsent && newFiles.length) {
        try {
          const captureLocation = await captureDeviceLocation();
          fd.append('captureLocation', JSON.stringify(captureLocation));
        } catch {
          showWarn('Device location was unavailable; the edit can still be saved.');
        }
      }
      const res = await updateIssue(issue._id, fd, uploadToken);
      showSuccess(res.message || 'Issue updated');
      onUpdated?.(res.data.issue);
      onClose?.();
    } catch (err) {
      showError(err.message || 'Failed to update issue');
    } finally {
      setSubmitting(false);
    }
  };

  const remainingInitial = initialImages.filter((src) => !removedImages.has(src));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Issue"
      description="Update details, evidence, or location for this report"
      size="xl"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <div className="space-y-4">
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
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue, including nearby landmarks, danger level, etc."
            error={errors.description}
          />
        </div>

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
            <div className="mt-2"><PriorityBadge priority={form.priority} /></div>
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

        <div>
          <label className="label">Evidence</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-1.5 relative rounded-md-plus border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/5 dark:border-brand-500/50'
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
            {(remainingInitial.length + newPreviews.length) > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 text-left">
                {remainingInitial.map((src, idx) => (
                  <div key={`ini-${idx}`} className={`relative aspect-square rounded-lg overflow-hidden border group ${removedImages.has(src) ? 'ring-2 ring-rose-500/70 grayscale' : 'border-paper-200 dark:border-brand-800'}`}>
                    <img src={src} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleRemoveInitial(src); }}
                      className="absolute top-1.5 right-1.5 h-7 w-7 rounded-md bg-white/90 dark:bg-brand-900/90 text-rose-600 shadow-sm flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5">
                      <Badge tone={removedImages.has(src) ? 'bg-rose-500/90 text-white' : 'bg-white/90 dark:bg-brand-900/90 text-paper-700 dark:text-paper-200 border-paper-200 dark:border-brand-700'} className="!py-0.5 text-[10px]">
                        {removedImages.has(src) ? 'Removed' : 'Existing'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {newPreviews.map((p, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-paper-200 dark:border-brand-800 group">
                    <img src={p} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeNewFile(idx); }}
                      className="absolute top-1.5 right-1.5 h-7 w-7 rounded-md bg-white/90 dark:bg-brand-900/90 text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5">
                      <Badge tone="bg-emerald-500/90 text-white" className="!py-0.5 text-[10px]">
                        New
                      </Badge>
                    </div>
                  </div>
                ))}
                {(remainingInitial.length + newPreviews.length) < 5 && (
                  <div className="aspect-square rounded-lg border border-dashed border-paper-200 dark:border-brand-800 flex flex-col items-center justify-center text-paper-400 gap-1.5">
                    <Upload className="h-4 w-4" />
                    <span className="text-[11px]">Add</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-paper-500 dark:text-paper-400">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-paper-100 dark:bg-brand-800">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-brand-700 dark:text-brand-300">Click to upload</span>
                  <span className="mx-1">or</span>
                  <span>drag and drop</span>
                </div>
                <p className="text-xs">PNG, JPG up to 5MB each · Max 5 images</p>
              </div>
            )}
          </div>
        </div>

        <div>
          {newFiles.length > 0 && (
            <label className="flex items-start gap-2.5 rounded-md-plus border border-paper-200 dark:border-brand-800 p-3 text-sm text-paper-700 dark:text-paper-300">
              <input
                type="checkbox"
                checked={captureConsent}
                onChange={(event) => setCaptureConsent(event.target.checked)}
                className="mt-1"
              />
              <span>When I save this edit, allow CivicConnect to collect my device GPS once and compare it with the report pin as an optional spam-review signal. Your browser will ask for permission only when you save. This is not verified proof of where a photo was taken. Staff only; never shown publicly.</span>
            </label>
          )}
          <label className="label flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Location
          </label>
          <div className="mt-1.5 space-y-3">
            <div className="h-60 rounded-lg overflow-hidden border border-paper-200 dark:border-brand-800">
              <MapView
                issues={[]}
                initialCenter={location.picked ? [location.lat, location.lng] : INDORE_CENTER}
                initialZoom={location.picked ? 15 : 5}
                onPickLocation={onPickLocation}
                picking
                selectedMarker={location.picked ? location : null}
                height="h-full"
              />
            </div>
            <Textarea
              label="Full Address"
              required
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address of reported issue"
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
          </div>
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="accent"
          onClick={onSubmit}
          loading={submitting}
          disabled={submitting}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Save Changes
        </Button>
      </ModalFooter>
    </Modal>
  );
}

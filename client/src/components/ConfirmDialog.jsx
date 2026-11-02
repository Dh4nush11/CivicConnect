import { AlertTriangle, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Modal, ModalFooter } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';

const iconTone = {
  danger: { cls: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', Icon: Trash2 },
  warning: { cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', Icon: AlertTriangle },
  info: { cls: 'text-brand-600 dark:text-brand-300', bg: 'bg-brand-50 dark:bg-brand-500/10', Icon: AlertCircle },
  success: { cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', Icon: CheckCircle2 },
};

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  tone = danger ? 'danger' : 'warning',
  confirmVariant = null,
  description,
}) {
  const t = iconTone[tone] || iconTone.warning;
  const Icon = t.Icon;
  const variant = confirmVariant || (tone === 'danger' ? 'danger' : 'primary');
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      icon={
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
          <Icon className={`h-5.5 w-5.5 ${t.cls}`} strokeWidth={2} />
        </div>
      }
    >
      <p className="text-[0.9rem] leading-relaxed text-brand-700/90 dark:text-paper-200">
        {message}
      </p>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

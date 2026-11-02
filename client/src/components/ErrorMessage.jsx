import { Alert } from '../components/ui/Alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function ErrorMessage({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <Alert
      tone="error"
      title={title}
      icon={<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
      className="shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-[0.86rem] leading-relaxed">
          {message || 'An unexpected error occurred. Please try again.'}
        </p>
        {onRetry && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRetry}
            className="shrink-0 self-start sm:self-auto"
          >
            Try Again
          </Button>
        )}
      </div>
    </Alert>
  );
}

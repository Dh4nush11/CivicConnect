import { Link, useNavigate } from 'react-router-dom';
import { MapPinX, ArrowLeft, Home, Undo2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center text-center py-10 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70%] pointer-events-none select-none">
        <div className="font-black text-[160px] sm:text-[220px] leading-none font-display tracking-tighter text-paper-100 dark:text-brand-900/80">
          404
        </div>
      </div>

      <div className="relative z-10 max-w-lg px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 mb-5 ring-1 ring-brand-500/20">
          <MapPinX className="h-8 w-8" strokeWidth={1.8} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-display text-brand-900 dark:text-paper-100 mb-2">
          Page not found
        </h1>
        <p className="text-paper-600 dark:text-paper-400 mb-8 leading-relaxed">
          The page you are looking for doesn't exist, has been moved, or the link you followed may be broken.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/">
            <Button variant="primary" size="md">
              <Home className="h-4 w-4 mr-1.5" />
              Go Home
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(-1)}
          >
            <Undo2 className="h-4 w-4 mr-1.5" />
            Go Back
          </Button>
        </div>

        <div className="mt-10 pt-6 border-t border-paper-200/60 dark:border-brand-800/60 max-w-sm mx-auto">
          <p className="text-xs text-paper-500 dark:text-paper-400 leading-relaxed">
            If you believe this is a mistake, please check the URL or navigate from the home page.
          </p>
        </div>
      </div>
    </div>
  );
}

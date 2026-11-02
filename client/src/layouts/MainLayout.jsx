import Navbar from '../components/Navbar';
import { Building2 } from 'lucide-react';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-full flex flex-col bg-paper-50 dark:bg-brand-950 text-brand-900 dark:text-paper-100">
      <Navbar />
      <main className="flex-1">
        <div className="page-max py-6 sm:py-8 lg:py-10">{children}</div>
      </main>
      <footer className="border-t border-paper-200 dark:border-white/10 bg-white/60 dark:bg-brand-950/60 backdrop-blur">
        <div className="page-max py-6 flex flex-col sm:flex-row justify-between gap-3 text-[0.8rem] text-brand-600/80 dark:text-paper-300">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900">
              <Building2 className="h-3 w-3" strokeWidth={2.2} />
            </span>
            <span className="font-semibold text-brand-800 dark:text-paper-100">CivicConnect</span>
            <span className="text-paper-300 dark:text-white/20">·</span>
            <span>Making Indore better together.</span>
          </p>
          <p className="tabular">
            Built with MERN stack · OpenStreetMap & CARTO tiles
          </p>
        </div>
      </footer>
    </div>
  );
}

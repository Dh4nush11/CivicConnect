import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, ImageOff } from 'lucide-react';
import { StatusBadge, PriorityBadge, CategoryBadge, Badge } from '../components/ui/Badge';
import { timeAgo } from '../utils/format';

export default function IssueCard({ issue, compact = false, onClick }) {
  const [lng, lat] = issue.location?.coordinates || [0, 0];
  const firstImg = issue.images?.[0];
  const upvoteCount = issue.upvoteCount ?? issue.upvotes?.length ?? 0;
  const createdAt = timeAgo(issue.createdAt);

  const Comp = onClick ? 'button' : Link;
  const linkProps = onClick
    ? { type: 'button', onClick }
    : { to: `/issues/${issue._id}` };

  return (
    <Comp
      {...linkProps}
      className="group text-left block surface overflow-hidden !p-0 hover:-translate-y-[1px] hover:shadow-card-hover transition-all duration-200"
    >
      {!compact && firstImg && (
        <div className="relative h-44 bg-paper-100 dark:bg-white/[0.03] overflow-hidden border-b border-paper-200 dark:border-white/10">
          <img
            src={firstImg}
            alt={issue.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
          <div className="absolute inset-0 items-center justify-center text-paper-300 dark:text-white/30 hidden">
            <ImageOff className="h-8 w-8" />
          </div>
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 flex-wrap">
            <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} showIcon size="sm" />
            <div className="ml-auto flex items-center gap-1.5">
              <StatusBadge status={issue.status} showIcon={false} size="sm" />
            </div>
          </div>
          {createdAt && (
            <div className="absolute bottom-3 left-3 text-[0.7rem] font-medium bg-white/90 dark:bg-brand-950/80 backdrop-blur px-2 py-0.5 rounded-badge text-brand-700 dark:text-paper-200 border border-paper-200/60 dark:border-white/10 tabular">
              {createdAt}
            </div>
          )}
        </div>
      )}

      {!compact && !firstImg && (
        <div className="relative h-28 bg-paper-100 dark:bg-white/[0.03] overflow-hidden border-b border-paper-200 dark:border-white/10">
          <div className="absolute inset-0 flex items-center justify-center text-paper-300 dark:text-white/20">
            <ImageOff className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 flex-wrap">
            <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} showIcon size="sm" />
            <div className="ml-auto flex items-center gap-1.5">
              <StatusBadge status={issue.status} showIcon={false} size="sm" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-4.5 space-y-3">
        {compact && (
          <div className="flex items-start gap-2 flex-wrap">
            <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} showIcon size="sm" />
            <StatusBadge status={issue.status} showIcon={false} size="sm" />
            <PriorityBadge priority={issue.priority} size="sm" />
            {issue.underReview && <Badge size="sm" tone="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">Under review</Badge>}
            {['suspected', 'confirmed'].includes(issue.spamStatus) && <Badge size="sm" tone="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20">Possible spam</Badge>}
          </div>
        )}
        {!compact && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityBadge priority={issue.priority} size="sm" />
            {issue.underReview && <Badge size="sm" tone="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">Under review</Badge>}
            {['suspected', 'confirmed'].includes(issue.spamStatus) && <Badge size="sm" tone="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20">Possible spam</Badge>}
          </div>
        )}
        <h3 className="font-display tracking-tightest text-brand-950 dark:text-white text-[0.98rem] leading-snug line-clamp-2 group-hover:text-brand-700 dark:group-hover:text-brand-200 transition-colors">
          {issue.title}
        </h3>
        {!compact && (
          <p className="text-[0.84rem] leading-relaxed text-brand-700/85 dark:text-paper-300 line-clamp-2">
            {issue.description}
          </p>
        )}
        <div className="flex items-center justify-between text-[0.76rem] pt-1 border-t border-paper-200/70 dark:border-white/10">
          <span className="flex items-center gap-1 text-brand-700/80 dark:text-paper-300 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="truncate">
              {issue.location?.address ||
                (lng && lat ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : 'Location attached')}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-paper-200 tabular shrink-0">
            <ThumbsUp className="h-3.5 w-3.5 opacity-80" />
            {upvoteCount}
          </span>
        </div>
      </div>
    </Comp>
  );
}

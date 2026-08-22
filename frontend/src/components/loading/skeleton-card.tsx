'use client';

interface SkeletonCardProps {
  count?: number;
  label?: string;
}

const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`relative overflow-hidden rounded bg-white/10 ${className}`}>
    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export function SkeletonCard({ count = 3, label = 'Loading credentials' }: SkeletonCardProps) {
  return (
    <div
      className="space-y-3 sm:space-y-4"
      role="status"
      aria-label={label}
      aria-busy="true"
      data-testid="skeleton-card"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white/10 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <SkeletonPulse className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <SkeletonPulse className="h-3 sm:h-4 w-2/3 max-w-[180px]" />
              <SkeletonPulse className="h-2 sm:h-3 w-1/3 max-w-[140px]" />
              <SkeletonPulse className="h-2 sm:h-3 w-1/4 max-w-[100px]" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
            <SkeletonPulse className="w-8 h-8 sm:w-9 sm:h-9 rounded" />
            <SkeletonPulse className="w-8 h-8 sm:w-9 sm:h-9 rounded" />
            <SkeletonPulse className="w-8 h-8 sm:w-9 sm:h-9 rounded" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}...</span>
    </div>
  );
}

export { SkeletonCard as default };
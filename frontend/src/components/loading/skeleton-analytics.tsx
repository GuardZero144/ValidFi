'use client';

const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`relative overflow-hidden rounded bg-white/10 ${className}`}>
    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export function SkeletonAnalytics() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading analytics" aria-busy="true" data-testid="skeleton-analytics">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <SkeletonPulse className="h-7 sm:h-8 w-48 sm:w-64" />
        <div className="flex gap-2 w-full sm:w-auto">
          <SkeletonPulse className="h-10 sm:h-9 w-28 sm:w-32" />
          <SkeletonPulse className="h-10 sm:h-9 w-32 sm:w-36" />
        </div>
      </div>

      {/* Status bar */}
      <SkeletonPulse className="h-10 sm:h-12 w-full" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
            <SkeletonPulse className="h-3 sm:h-4 w-28 sm:w-36 mb-2 sm:mb-3" />
            <SkeletonPulse className="h-8 sm:h-9 w-16 sm:w-20 mb-2" />
            <SkeletonPulse className="h-3 sm:h-3.5 w-36 sm:w-44" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 lg:col-span-2">
          <SkeletonPulse className="h-5 sm:h-6 w-40 sm:w-52 mb-3 sm:mb-4" />
          <SkeletonPulse className="h-48 sm:h-64 w-full" />
        </div>
        <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
          <SkeletonPulse className="h-5 sm:h-6 w-32 sm:w-40 mb-3 sm:mb-4" />
          <SkeletonPulse className="h-48 sm:h-64 w-full rounded-full" />
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
        <SkeletonPulse className="h-5 sm:h-6 w-36 sm:w-44 mb-3 sm:mb-4" />
        <div className="space-y-2 sm:space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 sm:gap-4">
              <SkeletonPulse className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonPulse className="h-3 sm:h-4 w-3/4 max-w-[240px]" />
                <SkeletonPulse className="h-2.5 sm:h-3 w-1/3 max-w-[120px]" />
              </div>
              <SkeletonPulse className="h-5 sm:h-6 w-14 sm:w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading analytics dashboard...</span>
    </div>
  );
}

export { SkeletonAnalytics as default };
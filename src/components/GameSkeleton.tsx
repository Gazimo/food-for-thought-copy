import { cn } from "@/lib/utils";

const TileGridSkeleton = () => {
  return (
    <div className="relative w-full aspect-[3/2] max-w-[500px] mx-auto bg-gray-200 rounded-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-[shimmer_2s_infinite]" />

      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 border border-gray-300/50 z-[2] pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-gray-300/50" />
        ))}
      </div>
    </div>
  );
};

const InputSkeleton = () => (
  <div className="w-full flex gap-2 items-center">
    <div className="relative w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>

    <div className="flex-1 relative h-12 bg-gray-200 rounded-lg overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>

    <div className="relative w-24 h-12 bg-gray-200 rounded-lg overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  </div>
);

const MapSkeleton = () => (
  <div className="relative w-full aspect-[3/2] max-w-[500px] mx-auto bg-gray-200 rounded-lg overflow-hidden">
    <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
  </div>
);

const ParagraphSkeleton = ({ lines = 2 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "h-4 bg-gray-200 rounded overflow-hidden",
          i === lines - 1 ? "w-2/3" : "w-full"
        )}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
    ))}
  </div>
);

export const DishSkeleton = () => {
  return (
    <>
      <TileGridSkeleton />
      <InputSkeleton />
    </>
  );
};

export const CountrySkeleton = () => {
  return (
    <>
      <MapSkeleton />
      <InputSkeleton />
    </>
  );
};

export const ProteinSkeleton = () => {
  return (
    <>
      <ParagraphSkeleton lines={2} />
      <InputSkeleton />
      <div className="text-center text-sm text-gray-400">
        <div className="w-24 h-4 mx-auto bg-gray-200 rounded overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      </div>
    </>
  );
};

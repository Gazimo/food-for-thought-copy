import Image from "next/image";
import { memo } from "react";
import { Tile } from "./Tile";

export const TileGrid = memo(function TileGrid({
  revealedTiles,
  blurredTiles,
  fullTiles,
}: {
  revealedTiles: boolean[];
  blurredTiles: string[];
  fullTiles: string[];
}) {
  const fullyRevealed = revealedTiles.every(Boolean);
  const width =
    typeof window !== "undefined" ? Math.min(window.innerWidth - 32, 500) : 500;
  const height = (width / 3) * 2;

  return (
    <div
      className="relative mx-auto"
      style={{ width: `${width}px`, height: `${height}px`, maxWidth: "100vw" }}
    >
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 z-[1]">
        {blurredTiles.map((tileUrl, index) => (
          <div key={`bg-${index}`} className="relative overflow-hidden">
            <Image
              src={tileUrl}
              alt={`background tile ${index + 1}`}
              fill
              className="object-cover opacity-60"
              sizes="(max-width: 768px) 33vw, 166px"
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-black/10 z-[2] pointer-events-none" />

      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 border border-white/20 z-[3] pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-white/20" />
        ))}
      </div>

      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 z-[4]">
        {fullTiles.map((tileUrl, index) => (
          <Tile
            key={index}
            tileUrl={tileUrl}
            rotate={revealedTiles[index]}
            width={width}
            height={height}
            showBorder={!fullyRevealed}
          />
        ))}
      </div>
    </div>
  );
});

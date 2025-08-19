import Image from "next/image";
import { memo, useState } from "react";

const FALLBACK_IMAGE = "/images/404.png";

export const Tile = memo(function Tile({
  tileUrl,
  rotate,
  width,
  height,
  showBorder,
}: {
  tileUrl: string;
  rotate: boolean;
  width: number;
  height: number;
  showBorder: boolean;
}) {
  const [src, setSrc] = useState(tileUrl);

  const handleImageError = () => {
    setSrc(FALLBACK_IMAGE);
  };

  return (
    <div
      className={`relative max-w-full transition-all duration-500 ${
        !showBorder ? "border-transparent" : "border border-gray-200"
      }`}
      style={{
        width: width / 3,
        height: height / 2,
        maxWidth: "100vw",
        perspective: "1000px",
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: rotate ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face (hidden when rotated) */}
        <div
          className="absolute w-full h-full bg-transparent"
          style={{ backfaceVisibility: "hidden" }}
        />

        {/* Back face (visible when rotated) */}
        <div
          className="absolute w-full h-full overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <Image
            src={src}
            alt="dish tile"
            fill
            className="w-full h-full object-cover"
            onError={handleImageError}
            priority
            sizes="(max-width: 768px) 33vw, 166px"
          />
        </div>
      </div>
    </div>
  );
});

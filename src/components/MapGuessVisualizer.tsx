"use client";

import worldData from "@/data/world-110m.json";
import { getColorForDistance } from "@/utils/colors";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

interface Guess {
  lat: number;
  lng: number;
  isCorrect: boolean;
  country: string;
  distance: number;
}

interface MapGuessVisualizerProps {
  guesses: Guess[];
}

export const MapGuessVisualizer = ({ guesses }: MapGuessVisualizerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 350 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
          userAgent
        );
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;

      setIsMobile(isMobileDevice || isTouchDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const projection = geoNaturalEarth1()
    .scale(isMobile ? 80 : 100)
    .translate([
      dimensions.width / (isMobile ? 2.0 : 2.2),
      dimensions.height / (isMobile ? 1.7 : 1.9),
    ])
    .rotate(isMobile ? [0, 0] : [-30, 0]);

  const pathGenerator = geoPath().projection(projection);

  const world = worldData as unknown as Topology<{
    countries: GeometryCollection;
  }>;

  const geoJson = feature(
    world,
    world.objects.countries
  ) as unknown as FeatureCollection<Geometry>;

  useEffect(() => {
    const resize = () => {
      if (svgRef.current) {
        const width = svgRef.current.clientWidth;
        const height = isMobile ? width / 1.8 : width / 2;
        setDimensions({ width, height });
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isMobile]);

  return (
    <div className="w-full overflow-hidden rounded border shadow">
      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        {geoJson.features.map((feature: Feature<Geometry>, i: number) => (
          <path
            key={i}
            d={pathGenerator(feature) || ""}
            fill="#f0f0f0"
            stroke="#ccc"
            strokeWidth={isMobile ? 0.3 : 0.5}
          />
        ))}

        {guesses.map((guess, i) => {
          const [x, y] = projection([guess.lng, guess.lat]) || [0, 0];
          return (
            <motion.circle
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              cx={x}
              cy={y}
              r={isMobile ? 4 : 6}
              fill={getColorForDistance(guess.distance)}
              stroke="#fff"
              strokeWidth={isMobile ? 1 : 1.5}
              className={guess.isCorrect ? "animate-pulseCorrect" : ""}
            >
              <title>{guess.country}</title>
            </motion.circle>
          );
        })}
      </svg>
    </div>
  );
};

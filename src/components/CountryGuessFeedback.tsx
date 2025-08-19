"use client";

import { motion } from "framer-motion";
import React from "react";
import { useCountUp } from "../hooks/useCountUp";
import { CountryGuessResult } from "../types/game";

interface CountryGuessFeedbackProps {
  guessResults: CountryGuessResult[];
}

export const CountryGuessFeedback: React.FC<CountryGuessFeedbackProps> = ({
  guessResults,
}) => {
  const getColorForDistance = (distance: number): string => {
    if (distance === 0) return "bg-green-500";
    if (distance < 500) return "bg-green-400";
    if (distance < 1000) return "bg-green-300";
    if (distance < 2000) return "bg-yellow-300";
    if (distance < 3500) return "bg-orange-300";
    if (distance < 6000) return "bg-red-300";
    return "bg-red-500";
  };

  const getDirectionArrow = (direction: string): string => {
    const directionMap: { [key: string]: string } = {
      N: "⬆️",
      NE: "↗️",
      E: "➡️",
      SE: "↘️",
      S: "⬇️",
      SW: "↙️",
      W: "⬅️",
      NW: "↖️",
      "": "",
      "N/A": "",
      Invalid: "❌",
    };
    return directionMap[direction] || direction;
  };

  const lastGuess = guessResults[guessResults.length - 1] ?? { distance: 0 };
  const animatedDistance = useCountUp(0, Math.round(lastGuess.distance), 1000);

  if (guessResults.length === 0) return null;

  const previousGuesses = [...guessResults.slice(0, -1)].sort((a, b) => {
    if (isNaN(a.distance)) return 1;
    if (isNaN(b.distance)) return -1;
    return a.distance - b.distance;
  });

  const renderGuess = (
    result: CountryGuessResult,
    animated = false,
    index: number
  ) => {
    const distanceValue =
      animated && !result.isCorrect
        ? animatedDistance
        : Math.round(result.distance);

    return (
      <motion.div
        key={result.country + result.distance + index}
        initial={animated ? { opacity: 0, y: 10 } : false}
        animate={animated ? { opacity: 1, y: 0 } : undefined}
        transition={animated ? { duration: 0.3 } : undefined}
        className={`p-3 rounded-lg border ${
          result.isCorrect ? "border-green-500 bg-green-50" : "border-gray-200"
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{result.country}</span>
          {!result.isCorrect && (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {distanceValue.toLocaleString()} km
              </span>
              <span className="text-sm flex items-center justify-center">
                {getDirectionArrow(result.direction)}
              </span>
              <div
                className={`w-4 h-4 rounded-full ${getColorForDistance(
                  result.distance
                )}`}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <h3 className="font-semibold text-lg mb-2">Previous Guesses:</h3>
      <div className="space-y-2">
        {renderGuess(lastGuess, true, -1)}
        {previousGuesses.map((g, i) => renderGuess(g, false, i))}
      </div>
    </>
  );
};

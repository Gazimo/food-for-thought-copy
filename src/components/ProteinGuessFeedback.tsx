"use client";

import { useGameStore } from "@/store/gameStore";
import { ProteinGuessResult } from "@/types/game";
import { AnimatePresence, motion } from "framer-motion";

interface ProteinGuessFeedbackProps {
  guessResults: ProteinGuessResult[];
  actualProtein: number;
}

export const ProteinGuessFeedback: React.FC<ProteinGuessFeedbackProps> = ({
  guessResults,
  actualProtein,
}) => {
  const { isProteinPhaseComplete } = useGameStore();
  const isComplete = isProteinPhaseComplete();

  if (guessResults.length === 0) return null;

  const getTemperatureInfo = (difference: number) => {
    if (difference === 0)
      return { temp: "🎉", status: "Perfect!", color: "text-green-600" };
    if (difference <= 2)
      return { temp: "🔥", status: "Boiling!", color: "text-red-500" };
    if (difference <= 5)
      return { temp: "🌡️", status: "Hot!", color: "text-orange-500" };
    if (difference <= 10)
      return { temp: "❄️", status: "Cold!", color: "text-blue-400" };
    return { temp: "🧊", status: "Freezing!", color: "text-blue-600" };
  };

  const getDirectionArrow = (guess: number, actual: number) => {
    if (guess === actual) return "🎉";
    return guess < actual ? "⬆️" : "⬇️";
  };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {guessResults.map((result, index) => {
          const tempInfo = getTemperatureInfo(result.difference);
          const arrow = getDirectionArrow(result.guess, result.actualProtein);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-gray-700 min-w-[60px]">
                  {result.guess}g
                </div>
                <div className="text-2xl">{arrow}</div>
                <div className={`font-semibold ${tempInfo.color}`}>
                  {tempInfo.status}
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl">{tempInfo.temp}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
        >
          <div className="text-lg font-semibold text-green-800">
            ✅ Actual protein content: {actualProtein}g per serving
          </div>
          {guessResults.length > 0 &&
            !guessResults[guessResults.length - 1].isCorrect && (
              <div className="text-sm text-green-600 mt-1">
                Your closest guess was{" "}
                {Math.min(...guessResults.map((result) => result.difference))}g
                off
              </div>
            )}
        </motion.div>
      )}
    </div>
  );
};

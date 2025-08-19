"use client";

import { useGameStore } from "@/store/gameStore";
import { AnimatePresence, motion } from "framer-motion";

export const GuessFeedback = () => {
  const { currentDish, gamePhase, revealedIngredients } = useGameStore();

  if (!currentDish) return null;

  if (gamePhase === "dish" && revealedIngredients <= 1) return null;

  return (
    <>
      {gamePhase !== "country" && revealedIngredients >= 1 && (
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-600">Revealed Ingredients:</div>
          <div className="flex flex-wrap gap-1">
            <AnimatePresence initial={false}>
              {currentDish.ingredients
                .slice(0, revealedIngredients - 1)
                .map((ingredient, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded border border-amber-300 list-none"
                  >
                    {ingredient}
                  </motion.li>
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
};

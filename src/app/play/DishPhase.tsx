import { GuessFeedback } from "@/components/GuessFeedback";
import { GuessInput } from "@/components/GuessInput";
import { useBlurredTiles, useDishTiles } from "@/hooks/useDishTiles";
import { useGameStore } from "@/store/gameStore";
import posthog from "posthog-js";
import { memo } from "react";
import { TileGrid } from "../../components/dish-image/TileGrid";
import { DishSkeleton } from "../../components/GameSkeleton";
import { useTodaysDish } from "../../hooks/useDishes";

export const DishPhase = memo(() => {
  const guessDish = useGameStore((state) => state.guessDish);
  const dishGuesses = useGameStore((state) => state.dishGuesses);
  const currentDish = useGameStore((state) => state.currentDish);
  const revealedTiles = useGameStore((state) => state.revealedTiles);
  const gameResults = useGameStore((state) => state.gameResults);
  const isDishPhaseComplete = useGameStore(
    (state) => state.isDishPhaseComplete
  );

  const { dish, isLoading: isDishLoading } = useTodaysDish();
  // Use database ID instead of extracting from filename
  const dishId = dish?.id?.toString();

  const { data: blurredTiles, isLoading: isBlurredLoading } =
    useBlurredTiles(dishId);
  const { data: fullTiles, isLoading: isTilesLoading } = useDishTiles(dishId);

  const isLoading = isDishLoading || isBlurredLoading || isTilesLoading;

  if (isLoading || !dish || !blurredTiles || !fullTiles) {
    return <DishSkeleton />;
  }

  const isComplete = isDishPhaseComplete();

  const handleGuess = (guess: string) => {
    const isCorrect =
      currentDish?.acceptableGuesses?.includes(guess.toLowerCase()) ?? false;

    posthog.capture("guess_dish", {
      guess,
      correct: isCorrect,
    });

    guessDish(guess);
  };

  return (
    <>
      {dishId && (
        <TileGrid
          revealedTiles={revealedTiles}
          blurredTiles={blurredTiles}
          fullTiles={fullTiles}
        />
      )}

      {!isComplete && (
        <div className="flex flex-col gap-2">
          {gameResults.dishGuesses.length === 0 && (
            <div className="text-center text-sm text-gray-600 mb-2">
              Make a guess to reveal the first tile
            </div>
          )}
          <GuessInput
            placeholder="e.g. Spaghetti, Sushi, Tacos..."
            onGuess={handleGuess}
            previousGuesses={dishGuesses}
            acceptableGuesses={currentDish?.acceptableGuesses}
          />
        </div>
      )}

      <GuessFeedback />

      {isComplete && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Dish: {currentDish?.name}</h3>
          <p className="text-gray-700">{currentDish?.blurb}</p>
        </div>
      )}

      {gameResults.dishGuesses.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-600">
            Guesses: {gameResults.dishGuesses.length} of 6
          </div>
          <div className="flex flex-wrap gap-1">
            {gameResults.dishGuesses.map((guess, index) => {
              const isCorrectGuess =
                currentDish?.acceptableGuesses?.some(
                  (acceptable) =>
                    acceptable.toLowerCase() === guess.toLowerCase()
                ) || currentDish?.name.toLowerCase() === guess.toLowerCase();

              return (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded border ${
                    isCorrectGuess
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-red-100 text-red-700 border-red-300"
                  }`}
                >
                  {guess}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
});

DishPhase.displayName = "DishPhase";

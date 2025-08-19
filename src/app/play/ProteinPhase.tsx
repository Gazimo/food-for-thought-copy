import { GuessInput } from "@/components/GuessInput";
import { IngredientProteinStrip } from "@/components/IngredientProteinStrip";
import { useGameStore } from "@/store/gameStore";
import { ProteinSkeleton } from "../../components/GameSkeleton";
import { ProteinGuessFeedback } from "../../components/ProteinGuessFeedback";
import { useTodaysDish } from "../../hooks/useDishes";

export function ProteinPhase() {
  const {
    guessProtein,
    proteinGuesses,
    proteinGuessResults,
    currentDish,
    isProteinPhaseComplete,
  } = useGameStore();
  const { isLoading } = useTodaysDish();

  if (isLoading) {
    return <ProteinSkeleton />;
  }

  const isComplete = isProteinPhaseComplete();

  if (!currentDish?.proteinPerServing) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">
          Protein data not available for this dish.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="w-full">
        <IngredientProteinStrip
          imageUrl={currentDish.imageUrl}
          dishName={currentDish.name}
          keyIngredients={currentDish.ingredients}
        />
      </div>
      {!isComplete && (
        <div className="flex flex-col gap-4">
          <GuessInput
            placeholder="Enter grams of protein..."
            onGuess={() => {}}
            onProteinGuess={guessProtein}
            previousProteinGuesses={proteinGuesses}
            actualProtein={currentDish.proteinPerServing}
          />
        </div>
      )}

      <ProteinGuessFeedback
        guessResults={proteinGuessResults}
        actualProtein={currentDish.proteinPerServing}
      />
    </div>
  );
}

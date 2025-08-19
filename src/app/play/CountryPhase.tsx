import { CountryGuessFeedback } from "@/components/CountryGuessFeedback";
import { GuessInput } from "@/components/GuessInput";
import { useGameStore } from "@/store/gameStore";
import posthog from "posthog-js";
import { CountrySkeleton } from "../../components/GameSkeleton";
import { MapGuessVisualizer } from "../../components/MapGuessVisualizer";
import { useTodaysDish } from "../../hooks/useDishes";
import { getCountryCoordsMap, getCountryNames } from "../../utils/countries";

export function CountryPhase() {
  const {
    guessCountry,
    countryGuessResults,
    countryGuesses,
    isCountryPhaseComplete,
  } = useGameStore();

  const isComplete = isCountryPhaseComplete();
  const countryNames = getCountryNames();
  const countryCoords = getCountryCoordsMap();
  const { isLoading } = useTodaysDish();

  if (isLoading) {
    return <CountrySkeleton />;
  }

  const handleGuess = (guess: string) => {
    const isCorrect = guessCountry(guess);

    setTimeout(() => {
      const match = countryGuessResults.find(
        (g) => g.country.toLowerCase() === guess.toLowerCase()
      );
      const distanceKm = match?.distance ?? null;

      posthog.capture("guess_country", {
        guess,
        correct: isCorrect,
        distanceKm,
      });
    }, 0);
  };

  const enrichedGuesses = countryGuessResults.map((g) => ({
    country: g.country,
    isCorrect: g.isCorrect,
    lat: countryCoords[g.country.toLowerCase()]?.lat || 0,
    lng: countryCoords[g.country.toLowerCase()]?.lng || 0,
    distance: g.distance,
  }));

  return (
    <div className="flex flex-col gap-4">
      <MapGuessVisualizer guesses={enrichedGuesses} />
      {!isComplete && (
        <div className="flex flex-col gap-4">
          <GuessInput
            placeholder="Enter a country name..."
            onGuess={handleGuess}
            suggestions={countryNames}
            previousGuesses={countryGuesses}
          />
        </div>
      )}
      <CountryGuessFeedback guessResults={countryGuessResults} />
    </div>
  );
}

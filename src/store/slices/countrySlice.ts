import { getCountryCoordsMap } from "@/utils/countries";
import { StateCreator } from "zustand";
import { CountryGuessResult, CountrySlice, GameState } from "../../types/game";
import { emojiThemes, launchEmojiBurst } from "../../utils/celebration";
import {
  calculateDirection,
  calculateDistance,
  capitalizeFirst,
  normalizeString,
} from "../../utils/gameHelpers";

const countryCoords = getCountryCoordsMap();

export const createCountrySlice: StateCreator<
  GameState,
  [],
  [],
  CountrySlice
> = (set, get) => ({
  countryGuesses: [],
  countryGuessResults: [],
  makeCountryGuess: (guess) => {
    const { currentDish, gamePhase } = get();
    if (!currentDish || gamePhase !== "country") return false;

    const normalizedGuess = normalizeString(guess);
    const isCorrect = normalizeString(currentDish.country) === normalizedGuess;
    const newGuesses = [...get().countryGuesses, normalizedGuess];

    const newResult: CountryGuessResult = {
      country: capitalizeFirst(normalizedGuess),
      isCorrect,
      distance: 0,
      direction: "N/A",
    };

    if (!isCorrect) {
      const guessCoords = countryCoords[normalizedGuess];
      const actualCoords = countryCoords[normalizeString(currentDish.country)];

      if (guessCoords && actualCoords) {
        newResult.distance = calculateDistance(
          guessCoords.lat,
          guessCoords.lng,
          actualCoords.lat,
          actualCoords.lng
        );
        newResult.direction = calculateDirection(
          guessCoords.lat,
          guessCoords.lng,
          actualCoords.lat,
          actualCoords.lng
        );
      } else {
        newResult.distance = NaN;
        newResult.direction = "Invalid";
      }
    }

    set((state) => ({
      countryGuesses: newGuesses,
      countryGuessResults: [...state.countryGuessResults, newResult],
      gameResults: {
        ...state.gameResults,
        countryGuesses: newGuesses,
        countryGuessSuccess: isCorrect,
      },
    }));

    return isCorrect;
  },
  resetCountryGuesses: () => {
    set({ countryGuessResults: [] });
  },
  revealCorrectCountry: () => {
    const { currentDish } = get();
    if (!currentDish) return;
    get().makeCountryGuess(currentDish.country);
  },
  getSortedCountryCoords: () => {
    return Object.keys(countryCoords)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = countryCoords[key];
        return acc;
      }, {} as typeof countryCoords);
  },
  guessCountry: (guess: string): boolean => {
    const state = get();
    const normalizedGuess = capitalizeFirst(normalizeString(guess));

    if (!state.currentDish || state.countryGuesses.includes(normalizedGuess)) {
      return false;
    }

    const isCorrect = normalizedGuess === state.currentDish.country;

    set((state) => ({
      countryGuesses: [...state.countryGuesses, normalizedGuess],
    }));

    state.makeCountryGuess(normalizedGuess);

    if (isCorrect) {
      state.updateGameResults({ countryGuessSuccess: true });
      // Launch confetti for correct country guess
      launchEmojiBurst(emojiThemes.country);

      // Check if this completes the game (all phases complete)
      const updatedState = get();
      if (
        updatedState.isDishPhaseComplete() &&
        updatedState.isCountryPhaseComplete() &&
        updatedState.isProteinPhaseComplete()
      ) {
        setTimeout(() => {
          updatedState.completeGame();
        }, 1000);
      }
    }

    state.saveCurrentGameState();
    return isCorrect;
  },
});

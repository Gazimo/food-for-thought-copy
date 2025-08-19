import { GameState } from "../types/game";
import { isDishGuessCorrect } from "../utils/gameHelpers";

export const selectIsDishPhaseComplete = (state: GameState): boolean => {
  if (!state.currentDish) return false;
  return state.dishGuesses.some((guess) =>
    isDishGuessCorrect(guess, state.currentDish!)
  );
};

export const selectIsCountryPhaseComplete = (state: GameState): boolean => {
  if (!state.currentDish) return false;
  return state.countryGuessResults.some((result) => result.isCorrect);
};

export const selectIsProteinPhaseComplete = (state: GameState): boolean => {
  if (!state.currentDish) return false;
  return state.proteinGuessResults.some((result) => result.isCorrect);
};

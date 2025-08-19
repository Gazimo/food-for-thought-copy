import { StateCreator } from "zustand";
import { GameState, ProteinGuessResult, ProteinSlice } from "../../types/game";
import { emojiThemes, launchEmojiBurst } from "../../utils/celebration";

export const createProteinSlice: StateCreator<
  GameState,
  [],
  [],
  ProteinSlice
> = (set, get) => ({
  proteinGuesses: [],
  proteinGuessResults: [],
  makeProteinGuess: (guess) => {
    const { currentDish, gamePhase } = get();
    if (!currentDish || gamePhase !== "protein") return false;

    const actualProtein = currentDish.proteinPerServing || 0;
    const isCorrect = guess === actualProtein;
    const newGuesses = [...get().proteinGuesses, guess];

    const newResult: ProteinGuessResult = {
      guess,
      actualProtein,
      difference: Math.abs(guess - actualProtein),
      isCorrect,
    };

    set((state) => ({
      proteinGuesses: newGuesses,
      proteinGuessResults: [...state.proteinGuessResults, newResult],
      gameResults: {
        ...state.gameResults,
        proteinGuesses: newGuesses,
        proteinGuessSuccess: isCorrect,
      },
    }));

    return isCorrect;
  },
  resetProteinGuesses: () => {
    set({ proteinGuessResults: [] });
  },
  revealCorrectProtein: () => {
    const { currentDish } = get();
    if (!currentDish?.proteinPerServing) return;
    get().makeProteinGuess(currentDish.proteinPerServing);
    get().completeGame();
  },
  guessProtein: (guess: number): boolean => {
    const state = get();

    if (!state.currentDish || state.proteinGuesses.includes(guess)) {
      return false;
    }

    set((state) => ({
      proteinGuesses: [...state.proteinGuesses, guess],
    }));

    const isCorrect = state.makeProteinGuess(guess);

    if (isCorrect) {
      state.updateGameResults({ proteinGuessSuccess: true });
      // Launch confetti for correct protein guess
      launchEmojiBurst(emojiThemes.protein);

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

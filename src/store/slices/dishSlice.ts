import { StateCreator } from "zustand";
import { DishSlice, GameState } from "../../types/game";
import { emojiThemes, launchEmojiBurst } from "../../utils/celebration";
import { isDishGuessCorrect, normalizeString } from "../../utils/gameHelpers";

export const createDishSlice: StateCreator<GameState, [], [], DishSlice> = (
  set,
  get
) => ({
  dishGuesses: [],
  revealedTiles: [false, false, false, false, false, false],
  revealedIngredients: 1,
  makeDishGuess: (guess) => {
    const { currentDish, gamePhase } = get();
    if (!currentDish || gamePhase !== "dish") return false;

    const normalizedGuess = normalizeString(guess);
    const isCorrect = isDishGuessCorrect(normalizedGuess, currentDish);
    const newGuesses = [...get().dishGuesses, normalizedGuess];

    set((state) => ({
      dishGuesses: newGuesses,
      gameResults: {
        ...state.gameResults,
        dishGuesses: newGuesses,
        dishGuessSuccess: isCorrect,
      },
    }));

    return isCorrect;
  },
  revealRandomTile: () => {
    const { revealedTiles } = get();
    const unrevealed = revealedTiles
      .map((val, idx) => (!val ? idx : null))
      .filter((v) => v !== null) as number[];

    if (unrevealed.length === 0) return;

    const index = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newTiles = [...revealedTiles];
    newTiles[index] = true;

    set({ revealedTiles: newTiles });
  },
  revealAllTiles: () => {
    set({ revealedTiles: [true, true, true, true, true, true] });
  },
  revealNextIngredient: () => {
    const { revealedIngredients, currentDish } = get();
    if (revealedIngredients < (currentDish?.ingredients.length || 0)) {
      set((state) => ({ revealedIngredients: state.revealedIngredients + 1 }));
    }
  },
  guessDish: (guess: string): boolean => {
    const state = get();
    const normalizedGuess = normalizeString(guess);

    if (!state.currentDish || state.dishGuesses.includes(normalizedGuess)) {
      return false;
    }

    set((state) => ({
      dishGuesses: [...state.dishGuesses, normalizedGuess],
    }));

    const isCorrect = isDishGuessCorrect(normalizedGuess, state.currentDish);

    if (isCorrect) {
      state.revealAllTiles();
      state.updateGameResults({ dishGuessSuccess: true });
      // Launch confetti for correct dish guess
      launchEmojiBurst(emojiThemes.dish);

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
    } else {
      // Reveal a random tile on incorrect guess
      state.revealRandomTile();
      // Also reveal next ingredient when tile is revealed
      state.revealNextIngredient();
    }

    state.saveCurrentGameState();
    return isCorrect;
  },
});

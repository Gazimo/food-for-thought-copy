import { StateCreator } from "zustand";
import { GameState, PersistenceSlice } from "../../types/game";

export const createPersistenceSlice: StateCreator<
  GameState,
  [],
  [],
  PersistenceSlice
> = (set, get) => ({
  hasRestoredState: false,
  saveState: (state) => {
    if (typeof window === "undefined") return;
    const gameStateToSave = {
      gamePhase: state.gamePhase,
      activePhase: state.activePhase,
      revealedTiles: state.revealedTiles,
      revealedIngredients: state.revealedIngredients,
      dishGuesses: state.dishGuesses,
      countryGuesses: state.countryGuesses,
      proteinGuesses: state.proteinGuesses,
      countryGuessResults: state.countryGuessResults,
      proteinGuessResults: state.proteinGuessResults,
      gameResults: state.gameResults,
      savedDate: new Date().toISOString().split("T")[0],
    };
    localStorage.setItem("fft-game-state", JSON.stringify(gameStateToSave));
  },
  restoreState: () => {
    if (typeof window === "undefined") return null;

    try {
      const saved = localStorage.getItem("fft-game-state");
      if (!saved) return null;

      const parsedState = JSON.parse(saved);
      const today = new Date().toISOString().split("T")[0];
      const savedDate = parsedState.savedDate;

      if (!savedDate || savedDate !== today) {
        localStorage.removeItem("fft-game-state");
        return null;
      }

      set({ hasRestoredState: true });
      return parsedState;
    } catch {
      localStorage.removeItem("fft-game-state");
      return null;
    }
  },
  saveCurrentGameState: () => {
    const currentState = get();
    currentState.saveState(currentState);
  },
  restoreGameStateFromStorage: () => {
    const restoredState = get().restoreState();
    if (restoredState) {
      set(restoredState);
      return true;
    }
    return false;
  },
});

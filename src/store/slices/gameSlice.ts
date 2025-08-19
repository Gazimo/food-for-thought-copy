import { StateCreator } from "zustand";
import { GameSlice, GameState } from "../../types/game";
import { updateStreak } from "../../utils/streak";

export const createGameSlice: StateCreator<GameState, [], [], GameSlice> = (
  set,
  get
) => ({
  gamePhase: "dish",
  activePhase: "dish",
  currentDish: null,
  dishes: [],
  gameResults: {
    dishGuesses: [],
    dishGuessSuccess: false,
    countryGuesses: [],
    countryGuessSuccess: false,
    proteinGuesses: [],
    proteinGuessSuccess: false,
    tracked: false,
  },
  loading: {
    dishGuess: false,
    countryGuess: false,
    proteinGuess: false,
  },
  modalVisible: true,
  streak: 0,
  setCurrentDish: (dish) => {
    set({ currentDish: dish });
  },
  startNewGame: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("fft-game-state");
    }
    const dishes = get().dishes;
    const dish =
      dishes.length > 0
        ? dishes[Math.floor(Math.random() * dishes.length)]
        : null;
    set({
      currentDish: dish,
      gamePhase: "dish",
      revealedIngredients: 1,
      dishGuesses: [],
      countryGuesses: [],
      proteinGuesses: [],
      gameResults: {
        dishGuesses: [],
        dishGuessSuccess: false,
        countryGuesses: [],
        countryGuessSuccess: false,
        proteinGuesses: [],
        proteinGuessSuccess: false,
        tracked: false,
      },
      revealedTiles: [false, false, false, false, false, false],
      countryGuessResults: [],
      proteinGuessResults: [],
    });
  },
  moveToCountryPhase: () => {
    set({ gamePhase: "country", activePhase: "country" });
  },
  moveToProteinPhase: () => {
    set({ gamePhase: "protein", activePhase: "protein" });
  },
  completeGame: () => {
    const newStreak = updateStreak();
    const state = get();
    const hasAnySuccess =
      state.gameResults.dishGuessSuccess ||
      state.gameResults.countryGuessSuccess ||
      state.gameResults.proteinGuessSuccess;
    const finalStatus = hasAnySuccess ? "won" : "lost";

    set({
      gamePhase: "complete",
      modalVisible: true,
      streak: newStreak,
      gameResults: {
        ...state.gameResults,
        status: finalStatus,
      },
    });
  },
  updateGameResults: (results) => {
    set((state) => ({
      gameResults: { ...state.gameResults, ...results },
    }));
  },
  toggleModal: (visible) => {
    if (visible !== undefined) {
      set({ modalVisible: visible });
    } else {
      set((state) => ({ modalVisible: !state.modalVisible }));
    }
  },
  setActivePhase: (phase) => {
    set({ activePhase: phase });
  },
  setStreak: (value) => {
    set({ streak: value });
  },
  setLoading: (key, value) => {
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    }));
  },
  markGameTracked: () => {
    set((state) => ({
      gameResults: { ...state.gameResults, tracked: true },
    }));
  },
  isDishPhaseComplete: () => {
    const state = get();
    if (!state.currentDish) return false;
    return state.dishGuesses.some((guess) => {
      const normalizedGuess = guess.toLowerCase();
      return (
        state.currentDish?.acceptableGuesses?.includes(normalizedGuess) ?? false
      );
    });
  },
  isCountryPhaseComplete: () => {
    const state = get();
    if (!state.currentDish) return false;
    return state.countryGuessResults.some((result) => result.isCorrect);
  },
  isProteinPhaseComplete: () => {
    const state = get();
    if (!state.currentDish) return false;
    return state.proteinGuessResults.some((result) => result.isCorrect);
  },
  isPhaseComplete: (phase: "dish" | "country" | "protein") => {
    const state = get();
    switch (phase) {
      case "dish":
        return state.isDishPhaseComplete();
      case "country":
        return state.isCountryPhaseComplete();
      case "protein":
        return state.isProteinPhaseComplete();
      default:
        return false;
    }
  },
});

import { Dish } from "./dishes";

export type GamePhase = "dish" | "country" | "protein" | "complete";

export interface LoadingStates {
  dishGuess: boolean;
  countryGuess: boolean;
  proteinGuess: boolean;
}

export interface GameResults {
  status?: "won" | "lost";
  dishGuesses: string[];
  dishGuessSuccess: boolean;
  countryGuesses: string[];
  countryGuessSuccess: boolean;
  proteinGuesses: number[];
  proteinGuessSuccess: boolean;
  tracked?: boolean;
  totalTime?: number; // We could add this later for tracking completion time
}

export interface CountryGuessResult {
  country: string;
  distance: number;
  direction: string;
  isCorrect: boolean;
}

export interface ProteinGuessResult {
  guess: number;
  actualProtein: number;
  difference: number;
  isCorrect: boolean;
}

export interface GameSlice {
  gamePhase: GamePhase;
  activePhase: "dish" | "country" | "protein";
  currentDish: Dish | null;
  dishes: Dish[];
  gameResults: GameResults;
  loading: LoadingStates;
  modalVisible: boolean;
  streak: number;
  setCurrentDish: (dish: Dish | null) => void;
  startNewGame: () => void;
  moveToCountryPhase: () => void;
  moveToProteinPhase: () => void;
  completeGame: () => void;
  updateGameResults: (results: Partial<GameResults>) => void;
  toggleModal: (visible?: boolean) => void;
  setActivePhase: (phase: "dish" | "country" | "protein") => void;
  setStreak: (value: number) => void;
  setLoading: (key: keyof LoadingStates, value: boolean) => void;
  markGameTracked: () => void;
  isDishPhaseComplete: () => boolean;
  isCountryPhaseComplete: () => boolean;
  isProteinPhaseComplete: () => boolean;
  isPhaseComplete: (phase: "dish" | "country" | "protein") => boolean;
}

export interface DishSlice {
  dishGuesses: string[];
  revealedTiles: boolean[];
  revealedIngredients: number;
  makeDishGuess: (guess: string) => boolean;
  guessDish: (guess: string) => boolean;
  revealRandomTile: () => void;
  revealAllTiles: () => void;
  revealNextIngredient: () => void;
}

export interface CountrySlice {
  countryGuesses: string[];
  countryGuessResults: CountryGuessResult[];
  makeCountryGuess: (guess: string) => boolean;
  guessCountry: (guess: string) => boolean;
  resetCountryGuesses: () => void;
  revealCorrectCountry: () => void;
  getSortedCountryCoords: () => Record<string, { lat: number; lng: number }>;
}

export interface ProteinSlice {
  proteinGuesses: number[];
  proteinGuessResults: ProteinGuessResult[];
  makeProteinGuess: (guess: number) => boolean;
  guessProtein: (guess: number) => boolean;
  resetProteinGuesses: () => void;
  revealCorrectProtein: () => void;
}

export interface PersistenceSlice {
  hasRestoredState: boolean;
  saveState: (state: Partial<GameState>) => void;
  restoreState: () => Partial<GameState> | null;
  saveCurrentGameState: () => void;
  restoreGameStateFromStorage: () => boolean;
}

export type GameState = GameSlice &
  DishSlice &
  CountrySlice &
  ProteinSlice &
  PersistenceSlice;

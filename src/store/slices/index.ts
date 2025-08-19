import { create } from "zustand";
import { GameState } from "../../types/game";
import { createCountrySlice } from "./countrySlice";
import { createDishSlice } from "./dishSlice";
import { createGameSlice } from "./gameSlice";
import { createPersistenceSlice } from "./persistenceSlice";
import { createProteinSlice } from "./proteinSlice";

export const useGameStore = create<GameState>()((...a) => ({
  ...createGameSlice(...a),
  ...createDishSlice(...a),
  ...createCountrySlice(...a),
  ...createProteinSlice(...a),
  ...createPersistenceSlice(...a),
}));

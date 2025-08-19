import { useGameStore } from "@/store/gameStore";
import posthog from "posthog-js";
import { GamePhase } from "../types/game";

export function usePhaseTransition() {
  const {
    activePhase,
    moveToCountryPhase,
    moveToProteinPhase,
    setActivePhase,
  } = useGameStore();

  const transitionToPhase = (targetPhase: Exclude<GamePhase, "complete">) => {
    // Use proper phase transition methods that update both gamePhase and activePhase
    switch (targetPhase) {
      case "dish":
        setActivePhase("dish");
        break;
      case "country":
        moveToCountryPhase();
        break;
      case "protein":
        moveToProteinPhase();
        break;
    }

    posthog.capture("phase_transition", {
      from: activePhase,
      to: targetPhase,
    });
  };

  return { transitionToPhase, activePhase };
}

import { Button } from "@/components/ui/button";
import { usePhaseTransition } from "@/hooks/usePhaseTransition";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";
import posthog from "posthog-js";

interface GameNavigationProps {
  activePhase: string;
  gamePhase: string;
  modalVisible: boolean;
  toggleModal: (visible: boolean) => void;
}

export function GameNavigation({
  activePhase,
  gamePhase,
  modalVisible,
  toggleModal,
}: GameNavigationProps) {
  const { transitionToPhase } = usePhaseTransition();
  const isDishPhaseComplete = useGameStore((state) =>
    state.isDishPhaseComplete()
  );
  const isCountryPhaseComplete = useGameStore((state) =>
    state.isCountryPhaseComplete()
  );


  if (activePhase === "dish" && isDishPhaseComplete) {
    return (
      <div className="flex flex-col gap-4 mt-4">
        <div className="text-center">
          <Button
            onClick={() => transitionToPhase("country")}
            className={cn(
              "px-4 py-2 rounded-lg",
              gamePhase === "country" && "animate-pulse"
            )}
            variant="phase"
          >
            Guess where it's from
          </Button>
        </div>
      </div>
    );
  }

  if (activePhase === "country") {
    return (
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex justify-between gap-2 items-center">
          <Button
            onClick={() => transitionToPhase("dish")}
            className="px-3 py-1 w-[42px] h-[42px]"
            variant="neutral"
          >
            ←
          </Button>
          {isCountryPhaseComplete && (
            <Button
              onClick={() => transitionToPhase("protein")}
              className="px-4 py-2 rounded-lg flex-1"
              variant="phase"
            >
              Guess the protein
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (activePhase === "protein") {
    return (
      <div className="flex flex-col gap-4 mt-2">
        <div className="text-left">
          <Button
            onClick={() => transitionToPhase("country")}
            className="px-3 py-1 w-[42px] h-[42px]"
            variant="neutral"
          >
            ←
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export function ShowResultsButton({
  gamePhase,
  modalVisible,
  toggleModal,
}: {
  gamePhase: string;
  modalVisible: boolean;
  toggleModal: (visible: boolean) => void;
}) {
  if (gamePhase !== "complete" || modalVisible) return null;

  return (
    <div className="text-center mt-4">
      <Button
        onClick={() => {
          toggleModal(true);
          posthog.capture("toggle_recipe_modal", { opened: true });
        }}
        className="px-4 py-2"
        variant="secondary"
      >
        Show Results
      </Button>
    </div>
  );
}

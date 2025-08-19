"use client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getClosestGuess } from "@/utils/gameHelpers";
import { memo, useState } from "react";
import { toast } from "react-hot-toast";
import { useGameStore } from "../store/gameStore";
import { GiveUpButton, NumberInput, TextInput } from "./inputs";

interface GuessInputProps {
  placeholder: string;
  onGuess: (guess: string) => void;
  suggestions?: string[];
  previousGuesses?: string[];
  acceptableGuesses?: string[];
  onProteinGuess?: (guess: number) => boolean;
  previousProteinGuesses?: number[];
  actualProtein?: number;
}

export const GuessInput: React.FC<GuessInputProps> = memo(
  ({
    placeholder,
    onGuess,
    suggestions = [],
    previousGuesses = [],
    acceptableGuesses = [],
    onProteinGuess,
    previousProteinGuesses = [],
    actualProtein,
  }) => {
    const [input, setInput] = useState("");
    const [shake, setShake] = useState(false);
    const revealAllTiles = useGameStore((state) => state.revealAllTiles);
    const completeGame = useGameStore((state) => state.completeGame);
    const moveToCountryPhase = useGameStore((state) => state.moveToCountryPhase);
    const activePhase = useGameStore((state) => state.activePhase);
    const currentDish = useGameStore((state) => state.currentDish);
    const revealCorrectCountry = useGameStore((state) => state.revealCorrectCountry);
    const revealCorrectProtein = useGameStore((state) => state.revealCorrectProtein);
    const isPhaseComplete = useGameStore((state) => state.isPhaseComplete);
    const loading = useGameStore((state) => state.loading);

    const isProteinPhase = activePhase === "protein";
    const isComplete = isPhaseComplete(activePhase);

    const isSubmitting =
      (activePhase === "dish" && loading.dishGuess) ||
      (activePhase === "country" && loading.countryGuess) ||
      (activePhase === "protein" && loading.proteinGuess);

    const triggerShake = () => {
      setShake(false);
      requestAnimationFrame(() => {
        setShake(true);
        setTimeout(() => setShake(false), 300);
      });
    };

    const handleProteinGuess = (guess: number) => {
      if (previousProteinGuesses.includes(guess)) {
        triggerShake();
        toast.error("You already guessed that number!");
        return;
      }

      const isCorrect = onProteinGuess?.(guess);

      if (isCorrect) {
        toast.success(`Correct! ${actualProtein}g protein per serving!`);
      } else {
        const difference = Math.abs(guess - (actualProtein || 0));
        if (difference <= 2) {
          toast("🔥 Very close!");
        } else if (difference <= 5) {
          toast("🌡️ Getting warm!");
        } else if (difference <= 10) {
          toast("❄️ Getting cold!");
        } else {
          toast("🧊 Freezing!");
        }
      }

      setInput("");
    };

    const handleTextGuess = (guess: string) => {
      const trimmed = guess.trim().toLowerCase();
      if (!trimmed) return;

      if (suggestions.length > 0) {
        const isValidSuggestion = suggestions.some(
          (suggestion) => suggestion.toLowerCase() === trimmed
        );

        if (!isValidSuggestion) {
          toast.error(
            `"${guess.trim()}" is not a valid country name. Please select from the suggestions.`
          );
          return;
        }
      }

      if (previousGuesses.includes(trimmed)) {
        triggerShake();
        toast.error("You already guessed that!");
        return;
      }

      const isCorrect = acceptableGuesses
        .map((s) => s.toLowerCase())
        .includes(trimmed);

      if (!isCorrect) {
        const suggestion = getClosestGuess(trimmed, acceptableGuesses);
        if (suggestion) {
          toast((t) => (
            <span>
              Did you mean{" "}
              <button
                className="text-blue-600 underline"
                onClick={() => {
                  toast.dismiss(t.id);
                  handleTextGuess(suggestion);
                }}
              >
                {suggestion}
              </button>
              ?
            </span>
          ));
          return;
        }
      }

      onGuess(trimmed);
      setInput("");
    };

    const handleGiveUp = () => {
      revealAllTiles();

      if (activePhase === "dish") {
        moveToCountryPhase();
      } else if (activePhase === "country" && currentDish) {
        revealCorrectCountry();
      } else if (activePhase === "protein" && currentDish?.proteinPerServing) {
        revealCorrectProtein();
      } else {
        completeGame();
      }
    };

    const canSubmit = isProteinPhase
      ? !isNaN(parseInt(input)) && parseInt(input) >= 0
      : !!input.trim();

    const shouldShowGiveUp = isProteinPhase
      ? previousProteinGuesses.length >= 3
      : false;

    return (
      <div className="w-full flex gap-2 items-center">
        <GiveUpButton onGiveUp={handleGiveUp} />

        {isProteinPhase ? (
          <NumberInput
            value={input}
            onChange={setInput}
            onSubmit={handleProteinGuess}
            placeholder={placeholder}
            shake={shake}
            min={0}
            max={200}
            disabled={isSubmitting}
          />
        ) : (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleTextGuess}
            placeholder={placeholder}
            suggestions={suggestions}
            previousGuesses={previousGuesses}
            shake={shake}
            disabled={isSubmitting}
          />
        )}

        <Button
          variant="primary"
          onClick={() => {
            if (isProteinPhase) {
              handleProteinGuess(parseInt(input));
            } else {
              handleTextGuess(input);
            }
          }}
          disabled={!canSubmit || isComplete || isSubmitting}
          className="min-w-[100px]"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Processing...</span>
            </div>
          ) : (
            "Submit"
          )}
        </Button>

        {shouldShowGiveUp && !isComplete && (
          <div className="absolute top-full left-0 right-0 text-center mt-2">
            <Button
              onClick={handleGiveUp}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Give up and see results
            </Button>
          </div>
        )}
      </div>
    );
  }
);

GuessInput.displayName = "GuessInput";

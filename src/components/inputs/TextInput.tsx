"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useGameStore } from "../../store/gameStore";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  suggestions?: string[];
  previousGuesses?: string[];
  shake?: boolean;
  disabled?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  suggestions = [],
  previousGuesses = [],
  shake = false,
  disabled = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { activePhase, isPhaseComplete } = useGameStore();
  const isComplete = isPhaseComplete(activePhase);

  const filteredSuggestions = suggestions
    .filter((suggestion) =>
      suggestion.toLowerCase().includes(value.toLowerCase())
    )
    .filter(
      (suggestion) =>
        !previousGuesses.some(
          (guess) => guess.toLowerCase() === suggestion.toLowerCase()
        )
    )
    .slice(0, 10);

  const handleSubmit = (submitValue: string) => {
    if (!submitValue.trim()) return;

    if (suggestions.length > 0) {
      const normalizedValue = submitValue.toLowerCase().trim();
      const isValidSuggestion = suggestions.some(
        (suggestion) => suggestion.toLowerCase() === normalizedValue
      );

      if (!isValidSuggestion) {
        toast.error(
          `"${submitValue}" is not a valid country name. Please select from the suggestions.`
        );
        return;
      }

      if (
        previousGuesses.some((guess) => guess.toLowerCase() === normalizedValue)
      ) {
        toast.error("You already guessed that country!");
        return;
      }
    }

    onSubmit(submitValue.trim());
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        handleSubmit(filteredSuggestions[selectedIndex]);
      } else {
        handleSubmit(value);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && value) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    handleSubmit(suggestion);
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    if (suggestions.length > 0 && newValue.trim()) {
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="flex-1 relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("w-full", shake && "animate-shake")}
        disabled={isComplete || disabled}
        autoComplete="off"
      />

      {showSuggestions && filteredSuggestions.length > 0 && value && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-blue-100 text-blue-900"
                  : "hover:bg-gray-100"
              )}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {showSuggestions &&
        value &&
        filteredSuggestions.length === 0 &&
        suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
            No countries match your search. Try typing a different country name.
          </div>
        )}
    </div>
  );
};

"use client";

import { cn } from "@/lib/utils";
import { ChangeEvent, KeyboardEvent } from "react";
import { useGameStore } from "../../store/gameStore";

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: number) => void;
  placeholder: string;
  shake: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  shake,
  min = 0,
  max = 1000,
  disabled = false,
}) => {
  const { activePhase, isPhaseComplete } = useGameStore();
  const isComplete = isPhaseComplete(activePhase);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (
      val === "" ||
      (!isNaN(Number(val)) && Number(val) >= min && Number(val) <= max)
    ) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim() && !isNaN(Number(value))) {
      onSubmit(Number(value));
    }
  };

  return (
    <div className="flex-1 relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2 border-2 rounded-lg transition-all duration-200",
          "border-gray-200 focus:border-blue-500 focus:outline-none",
          shake && "animate-shake"
        )}
        disabled={isComplete || disabled}
      />
    </div>
  );
};

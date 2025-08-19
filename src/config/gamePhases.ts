export interface GamePhaseConfig {
  key: string;
  title: string;
  icon: string;
}

export const GAME_PHASES: GamePhaseConfig[] = [
  {
    key: "dish",
    title: "🍽️ Guess the Dish",
    icon: "🍽️",
  },
  {
    key: "country",
    title: "🌍 Guess the Country of Origin",
    icon: "🌍",
  },
  {
    key: "protein",
    title: "💪 Guess the Protein Content",
    icon: "💪",
  },
];

export const getPhaseConfig = (
  phaseKey: string
): GamePhaseConfig | undefined => {
  return GAME_PHASES.find((phase) => phase.key === phaseKey);
};

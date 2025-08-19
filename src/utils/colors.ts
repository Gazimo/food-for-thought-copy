export const getColorForDistance = (distance: number): string => {

  if (distance === 0) return "#22c55e"; // green-500
  if (distance < 500) return "#4ade80"; // green-400
  if (distance < 1000) return "#86efac"; // green-300
  if (distance < 2000) return "#facc15"; // yellow-400
  if (distance < 3500) return "#fb923c"; // orange-400
  if (distance < 6000) return "#fca5a5"; // red-300
  return "#ef4444"; // red-500
};
import { loadDishes } from "@/utils/gameHelpers";
import { useQuery } from "@tanstack/react-query";
import { Dish } from "../types/dishes";

export const useDishes = () => {
  return useQuery({
    queryKey: ["dishes"],
    queryFn: loadDishes,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useTodaysDish = (): {
  dish: Dish | null;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
} => {
  const { data: dishes, isLoading, error, isError } = useDishes();

  return {
    dish: dishes?.[0] || null,
    isLoading,
    error,
    isError,
  };
};

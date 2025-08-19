import { useQuery } from "@tanstack/react-query";
import { IngredientDbItem } from "../types/ingredients";

async function fetchProteinDB(): Promise<IngredientDbItem[]> {
  const response = await fetch("/data/ingredient_protein_database.json");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

export function useProteinDB() {
  return useQuery<IngredientDbItem[], Error>({
    queryKey: ["proteinDB"],
    queryFn: fetchProteinDB,
  });
}

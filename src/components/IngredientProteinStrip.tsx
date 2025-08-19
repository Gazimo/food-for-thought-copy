"use client";

import { useProteinDB } from "@/hooks/useProteinDB";
import { IngredientDbItem } from "@/types/ingredients";
import {
  findBestProteinMatch,
  getIngredientIcon,
} from "@/utils/proteinMatcher";
import Image from "next/image";
import React, { useMemo } from "react";

interface IngredientProteinStripProps {
  imageUrl: string;
  dishName: string;
  keyIngredients: string[];
  maxItems?: number;
}

function TopMatchesDisplay({ topMatches }: { topMatches: IngredientDbItem[] }) {
  if (topMatches.length === 0) {
    return (
      <div className="text-xs text-gray-500">No protein sources detected</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-600 font-medium">
        Key protein sources (per 100g):
      </div>
      {topMatches.map((item) => {
        const IconComp = getIngredientIcon(item);
        return (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <IconComp className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 flex justify-between items-center">
              <span className="text-gray-700 capitalize">{item.name}</span>
              <span className="text-gray-500 font-medium">
                {item.protein_g_per_100g}g
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const IngredientProteinStrip: React.FC<IngredientProteinStripProps> = ({
  imageUrl,
  dishName,
  keyIngredients,
  maxItems = 4,
}) => {
  const { data: db, error } = useProteinDB();

  const topMatches = useMemo(() => {
    if (!db) return [];

    const matches: IngredientDbItem[] = [];
    const seenNames = new Set<string>();

    for (const ingredient of keyIngredients) {
      const match = findBestProteinMatch(ingredient, db);
      if (match && !seenNames.has(match.name)) {
        matches.push(match);
        seenNames.add(match.name);
      }
    }

    return matches
      .filter((m) => m.protein_g_per_100g >= 5)
      .sort((a, b) => b.protein_g_per_100g - a.protein_g_per_100g)
      .slice(0, maxItems);
  }, [db, keyIngredients, maxItems]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={dishName}
            fill
            sizes="(max-width: 640px) 100vw, 80vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      <div className="w-full">
        {error ? (
          <div className="text-xs text-red-500">
            Failed to load protein data
          </div>
        ) : (
          <TopMatchesDisplay topMatches={topMatches} />
        )}
      </div>
    </div>
  );
};

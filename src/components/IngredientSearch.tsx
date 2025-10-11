import { useState, useMemo, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IngredientData } from "@/types/ingredients";

interface IngredientSearchProps {
  ingredients: IngredientData[];
  onSelect: (ingredient: IngredientData) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const RECENT_KEY = "recentIngredients";
const FREQUENTLY_TOGETHER = [
  { names: ["Guar Gum", "Locust Bean Gum"], label: "Guar + LBG" },
];

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch {
    return [];
  }
}

function addRecent(id: string) {
  const recent = getRecent().filter(r => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

export function useIngredientSearch(ingredients: IngredientData[]) {
  const fuse = useMemo(
    () =>
      new Fuse(ingredients, {
        keys: ["name", "category", "tags"],
        threshold: 0.33,
        ignoreLocation: true,
        includeScore: true,
        includeMatches: true,
      }),
    [ingredients]
  );

  const [q, setQ] = useState("");
  
  const results = useMemo(() => {
    if (!q) return ingredients.slice(0, 5);
    return fuse.search(q).slice(0, 8).map(r => r.item);
  }, [q, fuse, ingredients]);

  const nearMatches = useMemo(() => {
    if (!q || results.length > 0) return [];
    return fuse.search(q, { limit: 3 }).map(r => r.item);
  }, [q, results, fuse]);

  return { q, setQ, results, nearMatches };
}

export function IngredientSearch({ ingredients, onSelect, open, onOpenChange }: IngredientSearchProps) {
  const { q, setQ, results, nearMatches } = useIngredientSearch(ingredients);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recentIds = getRecent();
  const recentIngredients = ingredients.filter(i => recentIds.includes(i.id));

  // Focus on "/" key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        onOpenChange?.(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (ingredient: IngredientData) => {
    addRecent(ingredient.id);
    onSelect(ingredient);
    setQ("");
    onOpenChange?.(false);
  };

  const indianIngredients = ingredients.filter(
    i => i.tags?.includes("indian") || i.name.toLowerCase().includes("alphonso") || i.name.toLowerCase().includes("mango")
  );
  const stabilizers = ingredients.filter(i => i.category === "stabilizer");

  const allResults = q ? results : recentIngredients;

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput
        ref={inputRef}
        placeholder="Search ingredients... (press / to focus)"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        {q && results.length === 0 && (
          <CommandEmpty>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm text-muted-foreground">No ingredients found</p>
              <Button variant="outline" size="sm">
                Request addition
              </Button>
              {nearMatches.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-2">Did you mean:</p>
                  <div className="flex flex-col gap-1">
                    {nearMatches.map(ing => (
                      <Button
                        key={ing.id}
                        variant="ghost"
                        size="sm"
                        className="justify-start h-auto py-1"
                        onClick={() => handleSelect(ing)}
                      >
                        <span className="font-medium">{ing.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {ing.category}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CommandEmpty>
        )}

        {!q && recentIngredients.length > 0 && (
          <CommandGroup heading="Recent">
            {recentIngredients.map((ing, idx) => (
              <CommandItem
                key={ing.id}
                value={ing.id}
                onSelect={() => handleSelect(ing)}
                className={selectedIndex === idx ? "bg-accent" : ""}
              >
                <span className="font-medium">{ing.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {ing.category}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {q && results.length > 0 && (
          <CommandGroup heading="Search Results">
            {results.map((ing, idx) => (
              <CommandItem
                key={ing.id}
                value={ing.id}
                onSelect={() => handleSelect(ing)}
                className={selectedIndex === idx ? "bg-accent" : ""}
              >
                <span className="font-medium">{ing.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {ing.category}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!q && (
          <>
            <CommandGroup heading="Frequently Together">
              {FREQUENTLY_TOGETHER.map((pair, idx) => (
                <CommandItem key={idx} disabled className="text-muted-foreground">
                  <span>{pair.label}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    combo
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>

            {indianIngredients.length > 0 && (
              <CommandGroup heading="Indian Ingredients">
                {indianIngredients.slice(0, 3).map(ing => (
                  <CommandItem
                    key={ing.id}
                    value={ing.id}
                    onSelect={() => handleSelect(ing)}
                  >
                    <span className="font-medium">{ing.name}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {ing.category}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {stabilizers.length > 0 && (
              <CommandGroup heading="Stabilizers">
                {stabilizers.slice(0, 3).map(ing => (
                  <CommandItem
                    key={ing.id}
                    value={ing.id}
                    onSelect={() => handleSelect(ing)}
                  >
                    <span className="font-medium">{ing.name}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {ing.category}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );
}

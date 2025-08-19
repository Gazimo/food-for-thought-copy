import countries from "../../public/data/countries.json";

export type CountryCoords = { lat: number; lng: number };
export type CountriesMap = Record<string, CountryCoords>;

export function getCountryCoordsMap(): Record<string, CountryCoords> {
  const mapped: Record<string, CountryCoords> = {};
  const countriesMap = countries as unknown as CountriesMap;

  const entries = Object.entries(countriesMap) as Array<
    [string, CountryCoords]
  >;

  for (const [name, coords] of entries) {
    const keyLower = name.toLowerCase();
    const keyNormalized = keyLower.replace(/[^a-z0-9]+/g, "");
    mapped[keyLower] = coords;
    mapped[keyNormalized] = coords;
  }
  return mapped;
}

export function getCountryNames(): string[] {
  return Object.keys(countries as CountriesMap).sort((a, b) =>
    a.localeCompare(b)
  );
}

export interface Database {
  public: {
    Tables: {
      dishes: {
        Row: {
          id: number;
          name: string;
          acceptable_guesses: string[];
          country: string;
          image_url: string | null;
          ingredients: string[];
          blurb: string;
          protein_per_serving: number;
          recipe: {
            ingredients: string[];
            instructions: string[];
          };
          tags: string[];
          release_date: string;
          coordinates: [number, number] | null;
          region: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          acceptable_guesses: string[];
          country: string;
          image_url?: string | null;
          ingredients: string[];
          blurb: string;
          protein_per_serving: number;
          recipe: {
            ingredients: string[];
            instructions: string[];
          };
          tags: string[];
          release_date: string;
          coordinates?: [number, number] | null;
          region?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          acceptable_guesses?: string[];
          country?: string;
          image_url?: string | null;
          ingredients?: string[];
          blurb?: string;
          protein_per_serving?: number;
          recipe?: {
            ingredients: string[];
            instructions: string[];
          };
          tags?: string[];
          release_date?: string;
          coordinates?: [number, number] | null;
          region?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type DishRow = Database["public"]["Tables"]["dishes"]["Row"];
export type DishInsert = Database["public"]["Tables"]["dishes"]["Insert"];
export type DishUpdate = Database["public"]["Tables"]["dishes"]["Update"];
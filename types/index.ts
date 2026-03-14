export type Category = "food" | "recreation" | "public_space";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  distance_km: number;
  created_at: string;
}

export interface TripPoint {
  id: number;
  trip_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  from_maps: boolean;
  osm_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  notes: string | null;
  is_public: boolean;
  visited_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  place_id: string;
  user_id: string;
  storage_path: string;
  storage_url: string;
  created_at: string;
}

// Extended types untuk joins
export interface PlaceWithReview extends Place {
  reviews?: Review[];
  photos?: Photo[];
}

export interface TripWithPlaces extends Trip {
  places?: PlaceWithReview[];
  trip_points?: TripPoint[];
}

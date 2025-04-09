
export interface Attribute {
    slug: string;
    name: string;
    terms: { id: number; name: string }[];
  }
  
  export interface FilterEvent {
    filters: { [key: string]: string[] };
    minPrice?: number;
    maxPrice?: number;
  }
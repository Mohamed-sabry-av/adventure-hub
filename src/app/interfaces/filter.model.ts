
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

  export interface FilterAttribute {
    name: string;
    slug: string;
    terms: { id: number; name: string }[];
  }
  
  export interface FilterResponse {
    [key: string]: FilterAttribute;
  }
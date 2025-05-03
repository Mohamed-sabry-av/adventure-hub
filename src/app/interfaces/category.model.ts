export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number ;
  display?: string;
  children?: Category[]; 
  count?: number;
  expanded?: boolean;
  totalProducts?: number;
}

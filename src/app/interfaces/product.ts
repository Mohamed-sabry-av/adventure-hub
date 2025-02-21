export interface Product {
      id: number;
      name: string;
      price: number;
      images: { src: string }[];
      categories: string[];
      description: string;
    }

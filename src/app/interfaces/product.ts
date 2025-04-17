export interface Product {
  id: number;
  currency: string;
  name: string;
  price: any;
  brand?: string;
  images: { src: string; alt?: string }[];
  categories: { id: number; name: string; slug: string }[];
  description: string;
  attributes?: Attribute[] |any;
  slug?: string;
  permalink?: string;
  date_created?: string;
  date_created_gmt?: string;
  date_modified?: string;
  date_modified_gmt?: string;
  type?: string;
  yoast_head?:string;
  status?: string;
  featured?: boolean;
  catalog_visibility?: string;
  short_description?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: any;
  date_on_sale_from_gmt?: any;
  date_on_sale_to?: any;
  date_on_sale_to_gmt?: any;
  on_sale?: boolean;
  purchasable?: boolean;
  total_sales?: number;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: any[];
  download_limit?: number;
  download_expiry?: number;
  external_url?: string;
  button_text?: string;
  tax_status?: string;
  tax_class?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  backorders?: string;
  backorders_allowed?: boolean;
  
  backordered?: boolean;
  low_stock_amount?: any;
  sold_individually?: boolean;
  weight?: string;
  shipping_required?: boolean;
  shipping_taxable?: boolean;
  shipping_class?: string;
  shipping_class_id?: number;
  reviews_allowed?: boolean;
  average_rating?: string;
  rating_count?: number;
  upsell_ids?: any[];
  cross_sell_ids?: any[];
  parent_id?: number;
  purchase_note?: string;
  tags?: any[];
  default_attributes?: { name: string; option: string }[];  variations: any[];
  grouped_products?: any[];
  menu_order?: number;
  price_html?: string;
  related_ids?: number[];
  stock_status?: string;
  has_options?: boolean;
  post_password?: string;
  global_unique_id?: string;
  yoast_head_json?: {
    title: string;
    description: string;
    canonical: string;
    og_title?: string;
    og_description?: string;
    og_url?: string;
    og_site_name?: string;
    og_image?: Array<{ url: string; width: number; height: number; type: string }>;
    robots?: { index: string; follow: string };
    twitter_card?: string;
    twitter_site?: string;
    schema?: any;
    [key: string]: any;
  };
    taxonomy_info?: any[];
  featured_image_src_large?: any[];
  author_info?: any[];
  comment_info?: string;
  meta_data?: MetaDaum[];
  brandSlug?: string;
  quantity_limits?: QuantityLimits;
}

export interface Variation {
  id?: number;
  attributes?: VariationAttribute[] | any;
  image?: Image | any;
  images?: { src: string; alt?: string }[] | any;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  meta_data?: MetaDaum[]
  quantity_limits?: QuantityLimits;
}

export interface CardState {
  variations: Variation[];
  colorOptions: { color: string; image: string; inStock: boolean }[];
  uniqueSizes: { size: string; inStock: boolean }[];
  selectedColor: string | null;
  selectedSize: string | null;
  currentSlide: number;
  isHovered: boolean;
  visibleSizes: { size: string; inStock: boolean }[];
  sizeScrollIndex: number;
  maxScrollIndex: number;
}

export interface MetaDaum {
  id?: number;
  key?: string;
  value?: any;
}

export interface VariationAttribute {
  id?: number;
  name?: string;
  option?: string;
}

export interface Image {
  id?: number;
  date_created: string;
  date_created_gmt?: string;
  date_modified?: string;
  date_modified_gmt?: string;
  src?: string;
  name?: string;
  alt?: string;
}

export interface Attribute {
  id?: number;
  slug?: string; // Use slug instead of name
  name?: string | any;
  terms?: { id: string; name: string }[];
  options: (string | { name?: string; value?: string; slug?: string })[];
}

export interface ProductAttribute {
  name: string;
  options: (string | { name?: string; value?: string })[]; // options ممكن تكون نصوص أو كائنات
}

export interface QuantityLimits {
  minimum?: number;
  maximum?: number;
  multiple_of?: number;
}

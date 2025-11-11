// Product Types for Shopify MCP

export interface ShopifyConfig {
  accessToken: string;
  shopDomain: string;
}

export interface ProductVariant {
  price?: string;
  sku?: string;
  inventory_quantity?: number;
  inventory_management?: string | null;
  inventory_policy?: string;
  option1?: string;
  option2?: string | null;
  option3?: string | null;
  weight?: number;
  weight_unit?: string;
  requires_shipping?: boolean;
  barcode?: string | null;
  compare_at_price?: string | null;
  fulfillment_service?: string;
  taxable?: boolean;
  grams?: number;
}

export interface ProductImage {
  src: string;
  alt?: string;
  position?: number;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface CreateProductRequest {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  status?: 'active' | 'draft' | 'archived';
  published_scope?: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
  options?: ProductOption[];
}

export interface ShopifyProductVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  position: number;
  inventory_policy: string;
  compare_at_price: string | null;
  fulfillment_service: string;
  inventory_management: string | null;
  option1: string;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode: string | null;
  grams: number;
  image_id: number | null;
  weight: number;
  weight_unit: string;
  inventory_item_id: number;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
  admin_graphql_api_id: string;
}

export interface ShopifyProductOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string | null;
  template_suffix: string | null;
  status: string;
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: ShopifyProductVariant[];
  options: ShopifyProductOption[];
  images: any[];
  image: any | null;
}

export interface CreateProductResponse {
  success: boolean;
  data?: ShopifyProduct;
  error?: string;
  details?: string;
}

// List Products Types
export interface ListProductsRequest {
  limit?: number;
  collection_id?: string;
  query?: string;
}

export interface ProductListItem {
  id: number;
  title: string;
  price: string;
  image: string | null;
  available: boolean;
  url: string;
}

export interface ListProductsResponse {
  success: boolean;
  data?: ProductListItem[];
  error?: string;
  details?: string;
}

// Get Product Info Types
export interface GetProductInfoRequest {
  product_id: string;
}

export interface ProductVariantInfo {
  id: number;
  title: string;
  price: string;
  sku: string;
  inventory_quantity: number;
  available: boolean;
  option1?: string;
  option2?: string | null;
  option3?: string | null;
  weight?: number;
  weight_unit?: string;
  compare_at_price?: string | null;
}

export interface ProductImageInfo {
  id: number;
  src: string;
  alt?: string;
  position: number;
}

export interface ProductDetailInfo {
  id: number;
  title: string;
  description: string;
  variants: ProductVariantInfo[];
  price: string;
  inventory: number;
  images: ProductImageInfo[];
  vendor?: string;
  product_type?: string;
  tags?: string[];
  url: string;
}

export interface GetProductInfoResponse {
  success: boolean;
  data?: ProductDetailInfo;
  error?: string;
  details?: string;
}

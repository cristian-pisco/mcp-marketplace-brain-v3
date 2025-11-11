// Collection Types for Shopify MCP
// Based on Shopify REST Admin API 2025-10

// ============================================================================
// Custom Collection Types
// ============================================================================

export interface CollectionImage {
  src?: string;
  alt?: string;
  attachment?: string; // Base64 encoded image data
}

export interface CollectionCollect {
  product_id: number;
}

export interface CreateCustomCollectionRequest {
  title: string; // Required - max 255 characters
  body_html?: string;
  handle?: string; // Auto-generated from title if not provided
  image?: CollectionImage;
  published?: boolean; // Default: true
  sort_order?: 'alpha-asc' | 'alpha-desc' | 'best-selling' | 'created' | 'created-desc' | 'manual' | 'price-asc' | 'price-desc';
  template_suffix?: string;
  collects?: CollectionCollect[]; // Products to include
}

export interface ShopifyCustomCollection {
  id: number;
  handle: string;
  title: string;
  updated_at: string;
  body_html: string | null;
  published_at: string | null;
  sort_order: string;
  template_suffix: string | null;
  published_scope: string;
  admin_graphql_api_id: string;
  image?: {
    created_at: string;
    alt: string | null;
    width: number;
    height: number;
    src: string;
  };
}

export interface CreateCustomCollectionResponse {
  success: boolean;
  data?: ShopifyCustomCollection;
  error?: string;
  details?: string;
}

// ============================================================================
// Smart Collection Types
// ============================================================================

export interface SmartCollectionRule {
  column: string; // e.g., "vendor", "title", "type", "tag", "variant_price", etc.
  relation: string; // e.g., "equals", "not_equals", "contains", "starts_with", "ends_with", "greater_than", "less_than"
  condition: string; // The value to match
  condition_object_id?: string; // Optional for metafield rules
}

export interface CreateSmartCollectionRequest {
  title: string; // Required - max 255 characters
  rules?: SmartCollectionRule[]; // Selection rules
  body_html?: string;
  handle?: string; // Auto-generated from title if not provided
  image?: CollectionImage;
  disjunctive?: boolean; // Default: false (AND logic). true = OR logic
  sort_order?: 'alpha-asc' | 'alpha-desc' | 'best-selling' | 'created' | 'created-desc' | 'manual' | 'price-asc' | 'price-desc';
  template_suffix?: string;
  published?: boolean; // Default: true
  published_scope?: string; // Default: "web"
}

export interface ShopifySmartCollection {
  id: number;
  handle: string;
  title: string;
  updated_at: string;
  body_html: string | null;
  published_at: string | null;
  sort_order: string;
  template_suffix: string | null;
  disjunctive: boolean;
  rules: SmartCollectionRule[];
  published_scope: string;
  admin_graphql_api_id: string;
  image?: {
    created_at: string;
    alt: string | null;
    width: number;
    height: number;
    src: string;
  };
}

export interface CreateSmartCollectionResponse {
  success: boolean;
  data?: ShopifySmartCollection;
  error?: string;
  details?: string;
}

// ============================================================================
// List Collections Types
// ============================================================================

export interface ListCollectionsRequest {
  limit?: number; // Max 250, default 50
}

export interface CollectionListItem {
  collection_id: number;
  title: string;
  handle: string;
}

export interface ListCollectionsResponse {
  success: boolean;
  data?: CollectionListItem[];
  error?: string;
  details?: string;
}

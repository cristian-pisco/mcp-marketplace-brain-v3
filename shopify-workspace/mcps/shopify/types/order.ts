// Order Types for Shopify MCP
// Based on Shopify REST Admin API 2025-10

// ============================================================================
// Common Types
// ============================================================================

export interface Address {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  province_code?: string;
  country?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
  company?: string;
}

export interface LineItem {
  variant_id?: number;
  product_id?: number;
  quantity: number;
  price?: string;
  title?: string;
  sku?: string;
  taxable?: boolean;
  requires_shipping?: boolean;
  grams?: number;
}

export interface Customer {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface TaxLine {
  title: string;
  price: string;
  rate: number;
}

export interface DiscountCode {
  code: string;
  amount: string;
  type: string;
}

// ============================================================================
// Create Order Types
// ============================================================================

export interface CreateOrderRequest {
  line_items: LineItem[]; // Required
  customer?: Customer;
  email?: string;
  phone?: string;
  shipping_address?: Address;
  billing_address?: Address;
  financial_status?: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
  fulfillment_status?: 'fulfilled' | 'partial' | 'null' | 'restocked';
  send_receipt?: boolean; // Default: false
  send_fulfillment_receipt?: boolean; // Default: false
  note?: string;
  tags?: string;
  discount_codes?: DiscountCode[];
  tax_lines?: TaxLine[];
  inventory_behaviour?: 'bypass' | 'decrement_ignoring_policy' | 'decrement_obeying_policy';
}

export interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  confirmation_number: string;
  created_at: string;
  updated_at: string;
  email: string;
  phone: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: any[];
  shipping_address: Address | null;
  billing_address: Address | null;
  customer: any;
  fulfillments: any[];
  cancel_reason: string | null;
  cancelled_at: string | null;
  closed_at: string | null;
}

export interface CreateOrderResponse {
  success: boolean;
  data?: ShopifyOrder;
  error?: string;
  details?: string;
}

// ============================================================================
// Draft Order Types
// ============================================================================

export interface DraftOrderLineItem {
  variant_id?: number; // For product variants
  title?: string; // For custom line items (required if custom)
  price?: string; // For custom line items (required if custom)
  quantity: number;
  taxable?: boolean;
  requires_shipping?: boolean;
  grams?: number;
}

export interface DraftOrderDiscount {
  value_type: 'fixed_amount' | 'percentage';
  value: string;
  title?: string;
  description?: string;
}

export interface CreateDraftOrderRequest {
  line_items: DraftOrderLineItem[]; // Required
  customer?: Customer;
  customer_id?: number;
  use_customer_default_address?: boolean;
  email?: string;
  shipping_address?: Address;
  billing_address?: Address;
  note?: string;
  tags?: string;
  applied_discount?: DraftOrderDiscount;
  tax_exempt?: boolean;
  tax_lines?: TaxLine[];
}

export interface ShopifyDraftOrder {
  id: number;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  invoice_url: string;
  line_items: any[];
  customer: any;
  shipping_address: Address | null;
  billing_address: Address | null;
  order_id: number | null;
}

export interface CreateDraftOrderResponse {
  success: boolean;
  data?: ShopifyDraftOrder;
  error?: string;
  details?: string;
}

// ============================================================================
// Get Order Info Types
// ============================================================================

export interface GetOrderInfoRequest {
  order_id?: string;
  order_number?: string;
}

export interface OrderLineItemInfo {
  id: number;
  variant_id: number;
  product_id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  fulfillment_status: string | null;
}

export interface OrderFulfillmentInfo {
  id: number;
  status: string;
  tracking_company: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderDetailInfo {
  order_id: number;
  order_number: number;
  name: string;
  created_at: string;
  status: string; // financial_status
  line_items: OrderLineItemInfo[];
  total_price: string;
  fulfillment_status: string | null;
  tracking_info: OrderFulfillmentInfo[];
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  shipping_address: Address | null;
  billing_address: Address | null;
}

export interface GetOrderInfoResponse {
  success: boolean;
  data?: OrderDetailInfo;
  error?: string;
  details?: string;
}

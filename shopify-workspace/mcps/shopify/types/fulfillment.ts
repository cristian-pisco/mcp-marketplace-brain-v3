// Fulfillment Types for Shopify MCP
// Based on Shopify REST Admin API 2025-10

// ============================================================================
// Create Fulfillment Types
// ============================================================================

export interface FulfillmentLineItem {
  id: number;
  quantity?: number;
}

export interface FulfillmentOrderLineItem {
  fulfillment_order_id: number;
  fulfillment_order_line_items?: FulfillmentLineItem[];
}

export interface TrackingInfo {
  company?: string;
  number?: string;
  url?: string;
}

export interface CreateFulfillmentRequest {
  line_items_by_fulfillment_order: FulfillmentOrderLineItem[]; // Required
  tracking_info?: TrackingInfo;
  notify_customer?: boolean;
  message?: string;
}

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: string; // pending, open, success, cancelled, error, failure
  created_at: string;
  updated_at: string;
  tracking_company: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  line_items: any[];
}

export interface CreateFulfillmentResponse {
  success: boolean;
  data?: ShopifyFulfillment;
  error?: string;
  details?: string;
}

// ============================================================================
// Update Fulfillment Status (via tracking update or cancel)
// ============================================================================

export interface UpdateFulfillmentTrackingRequest {
  fulfillment_id: string;
  tracking_info: TrackingInfo;
  notify_customer?: boolean;
}

export interface CancelFulfillmentRequest {
  fulfillment_id: string;
}

export interface UpdateFulfillmentResponse {
  success: boolean;
  data?: {
    updated: boolean;
    status: string;
    tracking_company?: string;
    tracking_number?: string;
    tracking_url?: string;
  };
  error?: string;
  details?: string;
}

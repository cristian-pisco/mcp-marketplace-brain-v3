// Customer Types for Shopify MCP
// Based on Shopify REST Admin API 2025-10

// ============================================================================
// Customer Address Types
// ============================================================================

export interface CustomerAddress {
  address1?: string;
  address2?: string;
  city?: string;
  company?: string;
  country?: string;
  country_code?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  province?: string;
  province_code?: string;
  zip?: string;
  default?: boolean;
}

// ============================================================================
// List Customers Types
// ============================================================================

export interface ListCustomersRequest {
  limit?: number; // Max 250, default 50
  query?: string; // Search query
}

export interface CustomerListItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

export interface ListCustomersResponse {
  success: boolean;
  data?: CustomerListItem[];
  error?: string;
  details?: string;
}

// ============================================================================
// Create Customer Types
// ============================================================================

export interface CreateCustomerRequest {
  first_name?: string; // Conditionally required: name, phone, or email required
  last_name?: string; // Conditionally required: name, phone, or email required
  email?: string; // Conditionally required: must be unique
  phone?: string; // Conditionally required: E.164 format, must be unique
  verified_email?: boolean;
  addresses?: CustomerAddress[]; // Up to 10 addresses
  send_email_welcome?: boolean; // Default: true
  send_email_invite?: boolean;
  note?: string;
  tax_exempt?: boolean;
  tags?: string; // Comma-separated tags
}

export interface ShopifyCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  state: string;
  orders_count: number;
  total_spent: string;
  verified_email: boolean;
  tax_exempt: boolean;
  tags: string;
  addresses: any[];
  note: string | null;
}

export interface CreateCustomerResponse {
  success: boolean;
  data?: {
    customer_id: number;
    created_at: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  error?: string;
  details?: string;
}

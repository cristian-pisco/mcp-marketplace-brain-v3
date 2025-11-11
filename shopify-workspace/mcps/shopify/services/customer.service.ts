import { ShopifyConfig } from "../types/product.ts";
import {
  ListCustomersRequest,
  ListCustomersResponse,
  CustomerListItem,
  CreateCustomerRequest,
  CreateCustomerResponse,
  ShopifyCustomer,
} from "../types/customer.ts";

export class CustomerService {
  private accessToken: string;
  private shopDomain: string;
  private apiVersion = "2025-10";

  constructor(config: ShopifyConfig) {
    this.accessToken = config.accessToken;
    this.shopDomain = config.shopDomain;
  }

  /**
   * Lists customers from Shopify store
   */
  async listCustomers(
    request: ListCustomersRequest = {}
  ): Promise<ListCustomersResponse> {
    try {
      const { limit = 50, query } = request;

      console.log("Listing customers with params:", { limit, query });

      // Build query parameters
      const params = new URLSearchParams();
      params.append("limit", limit.toString());

      // Note: Query parameter requires using the /customers/search.json endpoint
      const endpoint = query
        ? `/admin/api/${this.apiVersion}/customers/search.json?query=${encodeURIComponent(query)}&limit=${limit}`
        : `/admin/api/${this.apiVersion}/customers.json?${params.toString()}`;

      const response = await fetch(
        `https://${this.shopDomain}${endpoint}`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to list customers: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log(`Found ${responseData.customers?.length || 0} customers`);

      // Transform customers to simplified format
      const customers: CustomerListItem[] = (responseData.customers || []).map(
        (customer: ShopifyCustomer) => ({
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
        })
      );

      return {
        success: true,
        data: customers,
      };
    } catch (error: any) {
      console.error("Error listing customers:", error);
      return {
        success: false,
        error: error.message || "Failed to list customers",
        details: "An unexpected error occurred while listing customers",
      };
    }
  }

  /**
   * Creates a new customer in Shopify
   */
  async createCustomer(
    request: CreateCustomerRequest
  ): Promise<CreateCustomerResponse> {
    try {
      console.log("Creating customer with data:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/customers.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: request,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create customer: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Customer created successfully:", JSON.stringify(responseData, null, 2));

      const customer = responseData.customer as ShopifyCustomer;

      return {
        success: true,
        data: {
          customer_id: customer.id,
          created_at: customer.created_at,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
        },
      };
    } catch (error: any) {
      console.error("Error creating customer:", error);
      return {
        success: false,
        error: error.message || "Failed to create customer",
        details: "An unexpected error occurred while creating the customer",
      };
    }
  }
}

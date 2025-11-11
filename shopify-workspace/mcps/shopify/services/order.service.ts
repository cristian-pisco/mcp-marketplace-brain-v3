import { ShopifyConfig } from "../types/product.ts";
import {
  CreateOrderRequest,
  CreateOrderResponse,
  ShopifyOrder,
  CreateDraftOrderRequest,
  CreateDraftOrderResponse,
  ShopifyDraftOrder,
  GetOrderInfoRequest,
  GetOrderInfoResponse,
  OrderDetailInfo,
  OrderLineItemInfo,
  OrderFulfillmentInfo,
} from "../types/order.ts";

export class OrderService {
  private accessToken: string;
  private shopDomain: string;
  private apiVersion = "2025-10";

  constructor(config: ShopifyConfig) {
    this.accessToken = config.accessToken;
    this.shopDomain = config.shopDomain;
  }

  /**
   * Creates a new order in Shopify
   */
  async createOrder(
    request: CreateOrderRequest
  ): Promise<CreateOrderResponse> {
    try {
      console.log("Creating order with data:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/orders.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order: request,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create order: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Order created successfully:", JSON.stringify(responseData, null, 2));

      return {
        success: true,
        data: responseData.order as ShopifyOrder,
      };
    } catch (error: any) {
      console.error("Error creating order:", error);
      return {
        success: false,
        error: error.message || "Failed to create order",
        details: "An unexpected error occurred while creating the order",
      };
    }
  }

  /**
   * Creates a new draft order in Shopify
   */
  async createDraftOrder(
    request: CreateDraftOrderRequest
  ): Promise<CreateDraftOrderResponse> {
    try {
      console.log("Creating draft order with data:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/draft_orders.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            draft_order: request,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create draft order: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Draft order created successfully:", JSON.stringify(responseData, null, 2));

      return {
        success: true,
        data: responseData.draft_order as ShopifyDraftOrder,
      };
    } catch (error: any) {
      console.error("Error creating draft order:", error);
      return {
        success: false,
        error: error.message || "Failed to create draft order",
        details: "An unexpected error occurred while creating the draft order",
      };
    }
  }

  /**
   * Gets detailed information about a specific order
   */
  async getOrderInfo(
    request: GetOrderInfoRequest
  ): Promise<GetOrderInfoResponse> {
    try {
      const { order_id, order_number } = request;

      if (!order_id && !order_number) {
        return {
          success: false,
          error: "Either order_id or order_number is required",
          details: "You must provide at least one identifier to retrieve an order",
        };
      }

      console.log("Getting order info for:", { order_id, order_number });

      // If order_number is provided, we need to search for it first
      let orderId = order_id;
      if (!orderId && order_number) {
        // Search by order number using query parameter
        const searchResponse = await fetch(
          `https://${this.shopDomain}/admin/api/${this.apiVersion}/orders.json?name=%23${order_number}&status=any`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": this.accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        const searchData = await searchResponse.json();

        if (!searchResponse.ok || !searchData.orders || searchData.orders.length === 0) {
          return {
            success: false,
            error: "Order not found",
            details: `No order found with order_number: ${order_number}`,
          };
        }

        orderId = searchData.orders[0].id.toString();
      }

      // Fetch the specific order
      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/orders/${orderId}.json`,
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
          error: `Failed to get order info: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      const order = responseData.order as ShopifyOrder;

      if (!order) {
        return {
          success: false,
          error: "Order not found",
          details: `No order found with ID: ${orderId}`,
        };
      }

      console.log("Order found:", order.name);

      // Transform line items
      const line_items: OrderLineItemInfo[] = (order.line_items || []).map(
        (item: any) => ({
          id: item.id,
          variant_id: item.variant_id,
          product_id: item.product_id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku,
          fulfillment_status: item.fulfillment_status,
        })
      );

      // Transform fulfillment info
      const tracking_info: OrderFulfillmentInfo[] = (order.fulfillments || []).map(
        (fulfillment: any) => ({
          id: fulfillment.id,
          status: fulfillment.status,
          tracking_company: fulfillment.tracking_company,
          tracking_number: fulfillment.tracking_number,
          tracking_url: fulfillment.tracking_url,
          created_at: fulfillment.created_at,
          updated_at: fulfillment.updated_at,
        })
      );

      const orderDetail: OrderDetailInfo = {
        order_id: order.id,
        order_number: order.order_number,
        name: order.name,
        created_at: order.created_at,
        status: order.financial_status,
        line_items,
        total_price: order.total_price,
        fulfillment_status: order.fulfillment_status,
        tracking_info,
        customer: order.customer ? {
          id: order.customer.id,
          email: order.customer.email,
          first_name: order.customer.first_name,
          last_name: order.customer.last_name,
        } : null,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
      };

      return {
        success: true,
        data: orderDetail,
      };
    } catch (error: any) {
      console.error("Error getting order info:", error);
      return {
        success: false,
        error: error.message || "Failed to get order info",
        details: "An unexpected error occurred while getting order information",
      };
    }
  }
}

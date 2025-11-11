import { ShopifyConfig } from "../types/product.ts";
import {
  CreateFulfillmentRequest,
  CreateFulfillmentResponse,
  ShopifyFulfillment,
  UpdateFulfillmentTrackingRequest,
  CancelFulfillmentRequest,
  UpdateFulfillmentResponse,
} from "../types/fulfillment.ts";

export class FulfillmentService {
  private accessToken: string;
  private shopDomain: string;
  private apiVersion = "2025-10";

  constructor(config: ShopifyConfig) {
    this.accessToken = config.accessToken;
    this.shopDomain = config.shopDomain;
  }

  /**
   * Creates a new fulfillment for an order
   */
  async createFulfillment(
    request: CreateFulfillmentRequest
  ): Promise<CreateFulfillmentResponse> {
    try {
      console.log("Creating fulfillment with data:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/fulfillments.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fulfillment: request,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create fulfillment: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Fulfillment created successfully:", JSON.stringify(responseData, null, 2));

      return {
        success: true,
        data: responseData.fulfillment as ShopifyFulfillment,
      };
    } catch (error: any) {
      console.error("Error creating fulfillment:", error);
      return {
        success: false,
        error: error.message || "Failed to create fulfillment",
        details: "An unexpected error occurred while creating the fulfillment",
      };
    }
  }

  /**
   * Updates tracking information for a fulfillment
   */
  async updateFulfillmentTracking(
    request: UpdateFulfillmentTrackingRequest
  ): Promise<UpdateFulfillmentResponse> {
    try {
      const { fulfillment_id, tracking_info, notify_customer } = request;

      console.log("Updating fulfillment tracking:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/fulfillments/${fulfillment_id}/update_tracking.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fulfillment: {
              tracking_info,
              notify_customer,
            },
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to update fulfillment tracking: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Fulfillment tracking updated successfully");

      const fulfillment = responseData.fulfillment;

      return {
        success: true,
        data: {
          updated: true,
          status: fulfillment.status,
          tracking_company: fulfillment.tracking_company,
          tracking_number: fulfillment.tracking_number,
          tracking_url: fulfillment.tracking_url,
        },
      };
    } catch (error: any) {
      console.error("Error updating fulfillment tracking:", error);
      return {
        success: false,
        error: error.message || "Failed to update fulfillment tracking",
        details: "An unexpected error occurred while updating fulfillment tracking",
      };
    }
  }

  /**
   * Cancels a fulfillment
   */
  async cancelFulfillment(
    request: CancelFulfillmentRequest
  ): Promise<UpdateFulfillmentResponse> {
    try {
      const { fulfillment_id } = request;

      console.log("Cancelling fulfillment:", fulfillment_id);

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/fulfillments/${fulfillment_id}/cancel.json`,
        {
          method: "POST",
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
          error: `Failed to cancel fulfillment: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Fulfillment cancelled successfully");

      const fulfillment = responseData.fulfillment;

      return {
        success: true,
        data: {
          updated: true,
          status: fulfillment.status, // Should be 'cancelled'
        },
      };
    } catch (error: any) {
      console.error("Error cancelling fulfillment:", error);
      return {
        success: false,
        error: error.message || "Failed to cancel fulfillment",
        details: "An unexpected error occurred while cancelling the fulfillment",
      };
    }
  }
}

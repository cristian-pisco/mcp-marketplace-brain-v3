import { ShopifyConfig } from "../types/product.ts";
import {
  CreateCustomCollectionRequest,
  CreateCustomCollectionResponse,
  ShopifyCustomCollection,
  CreateSmartCollectionRequest,
  CreateSmartCollectionResponse,
  ShopifySmartCollection,
  ListCollectionsRequest,
  ListCollectionsResponse,
  CollectionListItem,
} from "../types/collection.ts";

export class CollectionService {
  private accessToken: string;
  private shopDomain: string;
  private apiVersion = "2025-10";

  constructor(config: ShopifyConfig) {
    this.accessToken = config.accessToken;
    this.shopDomain = config.shopDomain;
  }

  /**
   * Creates a new custom collection in Shopify
   * Custom collections are manual - products are added explicitly
   */
  async createCustomCollection(
    request: CreateCustomCollectionRequest
  ): Promise<CreateCustomCollectionResponse> {
    try {
      console.log("Creating custom collection with data:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/custom_collections.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            custom_collection: request,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create custom collection: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Custom collection created successfully:", JSON.stringify(responseData, null, 2));

      return {
        success: true,
        data: responseData.custom_collection as ShopifyCustomCollection,
      };
    } catch (error: any) {
      console.error("Error creating custom collection:", error);
      return {
        success: false,
        error: error.message || "Failed to create custom collection",
        details: "An unexpected error occurred while creating the custom collection",
      };
    }
  }

  /**
   * Creates a new smart collection in Shopify
   * Smart collections are automatic - products are added based on rules
   */
  async createSmartCollection(
    request: CreateSmartCollectionRequest
  ): Promise<CreateSmartCollectionResponse> {
    try {
      console.log("Creating smart collection with data:", JSON.stringify(request, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/smart_collections.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            smart_collection: request,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create smart collection: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Smart collection created successfully:", JSON.stringify(responseData, null, 2));

      return {
        success: true,
        data: responseData.smart_collection as ShopifySmartCollection,
      };
    } catch (error: any) {
      console.error("Error creating smart collection:", error);
      return {
        success: false,
        error: error.message || "Failed to create smart collection",
        details: "An unexpected error occurred while creating the smart collection",
      };
    }
  }

  /**
   * Lists all collections (both custom and smart) from Shopify store
   * Since Shopify has separate endpoints, this method fetches both and merges them
   */
  async listCollections(
    request: ListCollectionsRequest = {}
  ): Promise<ListCollectionsResponse> {
    try {
      const { limit = 50 } = request;

      console.log("Listing collections with limit:", limit);

      // Fetch custom collections and smart collections in parallel
      const [customResponse, smartResponse] = await Promise.all([
        fetch(
          `https://${this.shopDomain}/admin/api/${this.apiVersion}/custom_collections.json?limit=${limit}`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": this.accessToken,
              "Content-Type": "application/json",
            },
          }
        ),
        fetch(
          `https://${this.shopDomain}/admin/api/${this.apiVersion}/smart_collections.json?limit=${limit}`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": this.accessToken,
              "Content-Type": "application/json",
            },
          }
        ),
      ]);

      const customData = await customResponse.json();
      const smartData = await smartResponse.json();

      if (!customResponse.ok) {
        console.error("Shopify API error fetching custom collections:", customData);
        return {
          success: false,
          error: `Failed to fetch custom collections: ${customResponse.statusText}`,
          details: customData.errors
            ? JSON.stringify(customData.errors)
            : "Unknown error occurred",
        };
      }

      if (!smartResponse.ok) {
        console.error("Shopify API error fetching smart collections:", smartData);
        return {
          success: false,
          error: `Failed to fetch smart collections: ${smartResponse.statusText}`,
          details: smartData.errors
            ? JSON.stringify(smartData.errors)
            : "Unknown error occurred",
        };
      }

      console.log(`Found ${customData.custom_collections?.length || 0} custom collections`);
      console.log(`Found ${smartData.smart_collections?.length || 0} smart collections`);

      // Transform and merge collections
      const collections: CollectionListItem[] = [];

      // Add custom collections
      if (customData.custom_collections) {
        customData.custom_collections.forEach((collection: any) => {
          collections.push({
            collection_id: collection.id,
            title: collection.title,
            handle: collection.handle,
          });
        });
      }

      // Add smart collections
      if (smartData.smart_collections) {
        smartData.smart_collections.forEach((collection: any) => {
          collections.push({
            collection_id: collection.id,
            title: collection.title,
            handle: collection.handle,
          });
        });
      }

      return {
        success: true,
        data: collections,
      };
    } catch (error: any) {
      console.error("Error listing collections:", error);
      return {
        success: false,
        error: error.message || "Failed to list collections",
        details: "An unexpected error occurred while listing collections",
      };
    }
  }
}

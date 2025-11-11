import {
  ShopifyConfig,
  CreateProductRequest,
  CreateProductResponse,
  ShopifyProduct,
  ListProductsRequest,
  ListProductsResponse,
  ProductListItem,
  GetProductInfoRequest,
  GetProductInfoResponse,
  ProductDetailInfo,
  ProductVariantInfo,
  ProductImageInfo,
} from "../types/product.ts";

export class ShopifyService {
  private accessToken: string;
  private shopDomain: string;
  private apiVersion = "2025-10";

  constructor(config: ShopifyConfig) {
    this.accessToken = config.accessToken;
    this.shopDomain = config.shopDomain;
  }

  /**
   * Creates a new product in Shopify
   */
  async createProduct(
    productRequest: CreateProductRequest
  ): Promise<CreateProductResponse> {
    try {
      console.log("Creating product with data:", JSON.stringify(productRequest, null, 2));

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/products.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product: productRequest,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Shopify API error:", responseData);
        return {
          success: false,
          error: `Failed to create product: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log("Product created successfully:", JSON.stringify(responseData, null, 2));

      return {
        success: true,
        data: responseData.product as ShopifyProduct,
      };
    } catch (error: any) {
      console.error("Error creating product:", error);
      return {
        success: false,
        error: error.message || "Failed to create product",
        details: "An unexpected error occurred while creating the product",
      };
    }
  }

  /**
   * Lists products from Shopify store
   */
  async listProducts(
    request: ListProductsRequest = {}
  ): Promise<ListProductsResponse> {
    try {
      const { limit = 50, collection_id, query } = request;

      console.log("Listing products with params:", { limit, collection_id, query });

      // Build query parameters
      const params = new URLSearchParams();
      params.append("limit", limit.toString());

      if (collection_id) {
        params.append("collection_id", collection_id);
      }

      if (query) {
        params.append("title", query); // Shopify uses 'title' parameter for search
      }

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/products.json?${params.toString()}`,
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
          error: `Failed to list products: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      console.log(`Found ${responseData.products?.length || 0} products`);

      // Transform Shopify products to simplified format
      const products: ProductListItem[] = (responseData.products || []).map(
        (product: ShopifyProduct) => {
          // Get first variant's price or default to "0.00"
          const firstVariant = product.variants?.[0];
          const price = firstVariant?.price || "0.00";

          // Get first image or null
          const image = product.images?.[0]?.src || product.image?.src || null;

          // Check if product is available (has inventory or inventory is not tracked)
          const available = product.variants?.some(
            (v) => v.inventory_quantity > 0 || v.inventory_management === null
          ) || false;

          // Build product URL
          const url = `https://${this.shopDomain}/products/${product.handle}`;

          return {
            id: product.id,
            title: product.title,
            price,
            image,
            available,
            url,
          };
        }
      );

      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      console.error("Error listing products:", error);
      return {
        success: false,
        error: error.message || "Failed to list products",
        details: "An unexpected error occurred while listing products",
      };
    }
  }

  /**
   * Gets detailed information about a specific product
   */
  async getProductInfo(
    request: GetProductInfoRequest
  ): Promise<GetProductInfoResponse> {
    try {
      const { product_id } = request;

      console.log("Getting product info for ID:", product_id);

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/${this.apiVersion}/products/${product_id}.json`,
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
          error: `Failed to get product info: ${response.statusText}`,
          details: responseData.errors
            ? JSON.stringify(responseData.errors)
            : "Unknown error occurred",
        };
      }

      const product = responseData.product as ShopifyProduct;

      if (!product) {
        return {
          success: false,
          error: "Product not found",
          details: `No product found with ID: ${product_id}`,
        };
      }

      console.log("Product found:", product.title);

      // Transform variants to simplified format
      const variants: ProductVariantInfo[] = (product.variants || []).map(
        (variant) => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          inventory_quantity: variant.inventory_quantity,
          available: variant.inventory_quantity > 0 || variant.inventory_management === null,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
          weight: variant.weight,
          weight_unit: variant.weight_unit,
          compare_at_price: variant.compare_at_price,
        })
      );

      // Transform images to simplified format
      const images: ProductImageInfo[] = (product.images || []).map(
        (image: any) => ({
          id: image.id,
          src: image.src,
          alt: image.alt || undefined,
          position: image.position,
        })
      );

      // Calculate total inventory
      const totalInventory = variants.reduce(
        (sum, variant) => sum + (variant.inventory_quantity || 0),
        0
      );

      // Get first variant's price as main price
      const mainPrice = variants[0]?.price || "0.00";

      // Build product URL
      const url = `https://${this.shopDomain}/products/${product.handle}`;

      // Parse tags
      const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];

      const productDetail: ProductDetailInfo = {
        id: product.id,
        title: product.title,
        description: product.body_html || "",
        variants,
        price: mainPrice,
        inventory: totalInventory,
        images,
        vendor: product.vendor,
        product_type: product.product_type,
        tags,
        url,
      };

      return {
        success: true,
        data: productDetail,
      };
    } catch (error: any) {
      console.error("Error getting product info:", error);
      return {
        success: false,
        error: error.message || "Failed to get product info",
        details: "An unexpected error occurred while getting product information",
      };
    }
  }
}

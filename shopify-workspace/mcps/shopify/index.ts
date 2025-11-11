#!/usr/bin/env -S deno run -A

// Shopify MCP Server
// ------------------
// This MCP server provides tools to interact with Shopify Admin API

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "npm:zod";
import { CreateProductRequest } from "./types/product.ts";
import { CreateCustomCollectionRequest, CreateSmartCollectionRequest } from "./types/collection.ts";
import { CreateOrderRequest, CreateDraftOrderRequest } from "./types/order.ts";
import { CreateCustomerRequest } from "./types/customer.ts";
import { createShopifyService } from "./utils/auth.helper.ts";
import { CollectionService } from "./services/collection.service.ts";
import { OrderService } from "./services/order.service.ts";
import { CustomerService } from "./services/customer.service.ts";
import { FulfillmentService } from "./services/fulfillment.service.ts";

/**
 * Authentication Context
 *
 * When deployed via jelou-cli to production, this context is provided by the
 * OAuth2 middleware and contains validated user authentication information.
 *
 * Fields:
 * - headers: Always present - contains all HTTP request headers
 * - userId: Optional - authenticated user ID (only in production with auth enabled)
 * - accessToken: Optional - valid OAuth2 access token (only in production with auth enabled)
 * - authUrl: Optional - authorization URL if authentication failed
 * - valid: Optional - whether authentication was successful
 * - error: Optional - error message if authentication failed
 */
export interface AuthContext {
  headers: Record<string, string | undefined>;
  userId?: string;
  accessToken?: string;
  authUrl?: string;
  valid?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Shopify MCP Server Factory
 *
 * @param auth - Authentication context from OAuth2 middleware containing:
 *   - headers: HTTP request headers (always present)
 *   - userId: Authenticated user ID (only if auth is enabled and successful)
 *   - accessToken: Valid OAuth2 access token (only if auth is enabled and successful)
 *   - authUrl: Authorization URL if authentication failed
 *   - valid: Whether authentication was successful
 *
 * When deployed via jelou-cli with marketplace integration, this function receives
 * the auth context automatically. In development mode, it may be undefined.
 */
export default function createMcpServer(auth?: AuthContext): McpServer {
  console.log("======== CREATING SHOPIFY MCP SERVER");
  console.log("Auth Context:", JSON.stringify(auth, null, 2));

  // Create the MCP server instance with basic metadata
  const server = new McpServer({
    name: "shopify",
    version: "0.0.1"
  });

  // ---------------------------------------------------------------------------
  // Tool: create_product
  // ---------------------------------------------------------------------------
  // Creates a new product in Shopify with support for variants, images, and more
  server.tool(
    "create_product",
    "Create a new product in Shopify with support for variants, images, tags, and full product information",
    {
      title: z.string().describe("Product title/name (required)"),
      body_html: z.string().optional().describe("Product description with HTML formatting"),
      vendor: z.string().optional().describe("Product vendor/brand name"),
      product_type: z.string().optional().describe("Product type/category"),
      tags: z.string().optional().describe("Comma-separated product tags"),
      status: z.enum(['active', 'draft', 'archived']).optional().describe("Product status (default: active)"),
      variants: z.array(z.object({
        price: z.string().optional().describe("Variant price"),
        sku: z.string().optional().describe("Stock keeping unit"),
        inventory_quantity: z.number().optional().describe("Inventory quantity"),
        inventory_management: z.string().optional().describe("Inventory management (e.g., 'shopify')"),
        inventory_policy: z.string().optional().describe("Inventory policy (e.g., 'deny')"),
        option1: z.string().optional().describe("First option value"),
        option2: z.string().optional().describe("Second option value"),
        option3: z.string().optional().describe("Third option value"),
        weight: z.number().optional().describe("Variant weight"),
        weight_unit: z.string().optional().describe("Weight unit (e.g., 'kg', 'lb')"),
        requires_shipping: z.boolean().optional().describe("Whether variant requires shipping"),
        barcode: z.string().optional().describe("Product barcode"),
        compare_at_price: z.string().optional().describe("Compare at price (original price)"),
        fulfillment_service: z.string().optional().describe("Fulfillment service (default: 'manual')"),
        taxable: z.boolean().optional().describe("Whether variant is taxable"),
        grams: z.number().optional().describe("Weight in grams")
      })).optional().describe("Product variants"),
      images: z.array(z.object({
        src: z.string().describe("Image URL"),
        alt: z.string().optional().describe("Alt text for image"),
        position: z.number().optional().describe("Image position")
      })).optional().describe("Product images"),
      options: z.array(z.object({
        name: z.string().describe("Option name (e.g., 'Size', 'Color')"),
        values: z.array(z.string()).describe("Option values")
      })).optional().describe("Product options"),
      published_scope: z.string().optional().describe("Publication scope (default: web)")
    },
    async ({ title, body_html, vendor, product_type, tags, status, published_scope, variants, images, options }) => {
      console.log("======== SHOPIFY CREATE PRODUCT");
      console.log();
      console.log(JSON.stringify({ title, body_html, vendor, product_type, tags, status, variants, images, options }, null, 2));

      console.log(JSON.stringify(auth, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      // Prepare product request
      const productRequest: CreateProductRequest = {
        title,
        body_html,
        vendor,
        product_type,
        tags,
        status,
        published_scope,
        variants,
        images,
        options
      };

      const result = await shopifyService.createProduct(productRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create product: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: list_products
  // ---------------------------------------------------------------------------
  // Lists products from Shopify store with optional filters
  server.tool(
    "list_products",
    "Retrieve a list of available products with name, price, image, and availability. Supports filtering by collection and search query.",
    {
      limit: z.number().optional().default(50).describe("Maximum number of products to return (default: 50)"),
      collection_id: z.string().optional().describe("Filter products by collection ID"),
      query: z.string().optional().describe("Search products by title")
    },
    async ({ limit, collection_id, query }) => {
      console.log("======== SHOPIFY LIST PRODUCTS");
      console.log();
      console.log(JSON.stringify({ limit, collection_id, query }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const result = await shopifyService.listProducts({ limit, collection_id, query });

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list products: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: get_product_info
  // ---------------------------------------------------------------------------
  // Gets detailed information about a specific product
  server.tool(
    "get_product_info",
    "Get detailed information about a specific product including title, description, variants, pricing, inventory levels, and images.",
    {
      product_id: z.string().describe("The unique identifier of the product")
    },
    async ({ product_id }) => {
      console.log("======== SHOPIFY GET PRODUCT INFO");
      console.log();
      console.log(JSON.stringify({ product_id }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const result = await shopifyService.getProductInfo({ product_id });

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get product info: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: create_custom_collection
  // ---------------------------------------------------------------------------
  // Creates a manual custom collection where products are added explicitly
  server.tool(
    "create_custom_collection",
    "Create a manual custom collection in Shopify. Products must be added explicitly using the collects parameter. Use this for curated product groups.",
    {
      title: z.string().max(255).describe("Collection name (required, max 255 characters)"),
      body_html: z.string().optional().describe("Collection description with HTML formatting"),
      handle: z.string().optional().describe("URL-friendly identifier (auto-generated from title if not provided)"),
      image: z.object({
        src: z.string().optional().describe("Image URL"),
        alt: z.string().optional().describe("Alt text for image"),
        attachment: z.string().optional().describe("Base64 encoded image data")
      }).optional().describe("Collection image"),
      published: z.boolean().optional().describe("Whether collection is visible (default: true)"),
      sort_order: z.enum(['alpha-asc', 'alpha-desc', 'best-selling', 'created', 'created-desc', 'manual', 'price-asc', 'price-desc']).optional().describe("Product sorting method"),
      template_suffix: z.string().optional().describe("Custom liquid template suffix"),
      collects: z.array(z.object({
        product_id: z.number().describe("Product ID to add to collection")
      })).optional().describe("Products to include in this collection")
    },
    async ({ title, body_html, handle, image, published, sort_order, template_suffix, collects }) => {
      console.log("======== SHOPIFY CREATE CUSTOM COLLECTION");
      console.log();
      console.log(JSON.stringify({ title, body_html, handle, image, published, sort_order, template_suffix, collects }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      // Create collection service instance
      const collectionService = new CollectionService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const collectionRequest: CreateCustomCollectionRequest = {
        title,
        body_html,
        handle,
        image,
        published,
        sort_order,
        template_suffix,
        collects
      };

      const result = await collectionService.createCustomCollection(collectionRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create custom collection: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: create_smart_collection
  // ---------------------------------------------------------------------------
  // Creates an automatic smart collection where products are added based on rules
  server.tool(
    "create_smart_collection",
    "Create an automatic smart collection in Shopify. Products are automatically added based on rules. Supports conditions on vendor, title, type, tags, price, inventory, etc.",
    {
      title: z.string().max(255).describe("Collection name (required, max 255 characters)"),
      rules: z.array(z.object({
        column: z.string().describe("Field to filter on (e.g., 'vendor', 'title', 'type', 'tag', 'variant_price', 'variant_inventory')"),
        relation: z.string().describe("Comparison operator (e.g., 'equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than')"),
        condition: z.string().describe("Value to compare against"),
        condition_object_id: z.string().optional().describe("Optional for metafield rules")
      })).optional().describe("Selection rules for automatic product inclusion"),
      body_html: z.string().optional().describe("Collection description with HTML formatting"),
      handle: z.string().optional().describe("URL-friendly identifier (auto-generated from title if not provided)"),
      image: z.object({
        src: z.string().optional().describe("Image URL"),
        alt: z.string().optional().describe("Alt text for image"),
        attachment: z.string().optional().describe("Base64 encoded image data")
      }).optional().describe("Collection image"),
      disjunctive: z.boolean().optional().describe("Rule logic: false = AND (all rules must match), true = OR (any rule matches). Default: false"),
      sort_order: z.enum(['alpha-asc', 'alpha-desc', 'best-selling', 'created', 'created-desc', 'manual', 'price-asc', 'price-desc']).optional().describe("Product sorting method"),
      template_suffix: z.string().optional().describe("Custom liquid template suffix"),
      published: z.boolean().optional().describe("Whether collection is visible (default: true)"),
      published_scope: z.string().optional().describe("Publication scope: 'web' or 'global' (default: 'web')")
    },
    async ({ title, rules, body_html, handle, image, disjunctive, sort_order, template_suffix, published, published_scope }) => {
      console.log("======== SHOPIFY CREATE SMART COLLECTION");
      console.log();
      console.log(JSON.stringify({ title, rules, body_html, handle, image, disjunctive, sort_order, template_suffix, published, published_scope }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      // Create collection service instance
      const collectionService = new CollectionService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const collectionRequest: CreateSmartCollectionRequest = {
        title,
        rules,
        body_html,
        handle,
        image,
        disjunctive,
        sort_order,
        template_suffix,
        published,
        published_scope
      };

      const result = await collectionService.createSmartCollection(collectionRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create smart collection: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: list_collections
  // ---------------------------------------------------------------------------
  // Lists all collections (custom and smart) from the store
  server.tool(
    "list_collections",
    "List all product collections (both custom and smart collections) from the Shopify store with their IDs, titles, and handles.",
    {
      limit: z.number().optional().default(50).describe("Maximum number of collections to return (max 250, default: 50)")
    },
    async ({ limit }) => {
      console.log("======== SHOPIFY LIST COLLECTIONS");
      console.log();
      console.log(JSON.stringify({ limit }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const collectionService = new CollectionService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const result = await collectionService.listCollections({ limit });

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list collections: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: create_order
  // ---------------------------------------------------------------------------
  // Creates a confirmed order in Shopify
  server.tool(
    "create_order",
    "Create a new confirmed order in Shopify. Note: No payment is collected via API. Use this after confirming purchase in chat.",
    {
      line_items: z.array(z.object({
        variant_id: z.number().optional().describe("Product variant ID"),
        product_id: z.number().optional().describe("Product ID"),
        quantity: z.number().describe("Quantity to order"),
        price: z.string().optional().describe("Override price"),
        title: z.string().optional().describe("Line item title"),
        sku: z.string().optional().describe("SKU"),
        taxable: z.boolean().optional().describe("Is taxable"),
        requires_shipping: z.boolean().optional().describe("Requires shipping")
      })).describe("Order line items (required)"),
      customer: z.object({
        id: z.number().optional().describe("Existing customer ID"),
        email: z.string().optional().describe("Customer email"),
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
        phone: z.string().optional().describe("Phone number")
      }).optional().describe("Customer information"),
      email: z.string().optional().describe("Customer email"),
      phone: z.string().optional().describe("Customer phone"),
      shipping_address: z.object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        zip: z.string().optional(),
        phone: z.string().optional()
      }).optional().describe("Shipping address"),
      billing_address: z.object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        zip: z.string().optional(),
        phone: z.string().optional()
      }).optional().describe("Billing address"),
      financial_status: z.enum(['pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided']).optional().describe("Payment status"),
      send_receipt: z.boolean().optional().describe("Send email confirmation (default: false)"),
      note: z.string().optional().describe("Order note"),
      tags: z.string().optional().describe("Comma-separated tags")
    },
    async ({ line_items, customer, email, phone, shipping_address, billing_address, financial_status, send_receipt, note, tags }) => {
      console.log("======== SHOPIFY CREATE ORDER");
      console.log();

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const orderService = new OrderService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const orderRequest: CreateOrderRequest = {
        line_items,
        customer,
        email,
        phone,
        shipping_address,
        billing_address,
        financial_status,
        send_receipt,
        note,
        tags
      };

      const result = await orderService.createOrder(orderRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create order: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: create_draft_order
  // ---------------------------------------------------------------------------
  // Creates a draft order that can be invoiced to customer
  server.tool(
    "create_draft_order",
    "Create a draft order in Shopify. Draft orders can include custom items and generate invoice URLs for customer payment.",
    {
      line_items: z.array(z.object({
        variant_id: z.number().optional().describe("Product variant ID (for existing products)"),
        title: z.string().optional().describe("Custom line item title (required for custom items)"),
        price: z.string().optional().describe("Price (required for custom items)"),
        quantity: z.number().describe("Quantity"),
        taxable: z.boolean().optional().describe("Is taxable"),
        requires_shipping: z.boolean().optional().describe("Requires shipping")
      })).describe("Order line items (required)"),
      customer_id: z.number().optional().describe("Existing customer ID"),
      email: z.string().optional().describe("Customer email"),
      shipping_address: z.object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        address1: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        zip: z.string().optional()
      }).optional().describe("Shipping address"),
      note: z.string().optional().describe("Order note"),
      tags: z.string().optional().describe("Comma-separated tags")
    },
    async ({ line_items, customer_id, email, shipping_address, note, tags }) => {
      console.log("======== SHOPIFY CREATE DRAFT ORDER");
      console.log();

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const orderService = new OrderService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const draftOrderRequest: CreateDraftOrderRequest = {
        line_items,
        customer_id,
        email,
        shipping_address,
        note,
        tags
      };

      const result = await orderService.createDraftOrder(draftOrderRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create draft order: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: get_order_info
  // ---------------------------------------------------------------------------
  // Gets detailed information about an order
  server.tool(
    "get_order_info",
    "Retrieve detailed information about a specific order including status, line items, total price, fulfillment status, and tracking information.",
    {
      order_id: z.string().optional().describe("Order ID"),
      order_number: z.string().optional().describe("Order number (provide either order_id or order_number)")
    },
    async ({ order_id, order_number }) => {
      console.log("======== SHOPIFY GET ORDER INFO");
      console.log();
      console.log(JSON.stringify({ order_id, order_number }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const orderService = new OrderService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const result = await orderService.getOrderInfo({ order_id, order_number });

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get order info: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: list_customers
  // ---------------------------------------------------------------------------
  // Lists registered customers
  server.tool(
    "list_customers",
    "Retrieve a list of registered customers with their basic information. Use to identify if customer exists before creating orders.",
    {
      limit: z.number().optional().default(50).describe("Maximum number of customers to return (max 250, default: 50)"),
      query: z.string().optional().describe("Search query to filter customers (e.g., 'email:customer@example.com')")
    },
    async ({ limit, query }) => {
      console.log("======== SHOPIFY LIST CUSTOMERS");
      console.log();
      console.log(JSON.stringify({ limit, query }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const customerService = new CustomerService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const result = await customerService.listCustomers({ limit, query });

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list customers: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: create_customer
  // ---------------------------------------------------------------------------
  // Registers a new customer
  server.tool(
    "create_customer",
    "Register a new customer in Shopify. Email and phone must be unique. At least one of: name, email, or phone is required.",
    {
      first_name: z.string().optional().describe("Customer first name"),
      last_name: z.string().optional().describe("Customer last name"),
      email: z.string().optional().describe("Customer email (must be unique)"),
      phone: z.string().optional().describe("Customer phone in E.164 format (must be unique)"),
      addresses: z.array(z.object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        zip: z.string().optional(),
        phone: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional()
      })).optional().describe("Customer addresses (up to 10)"),
      note: z.string().optional().describe("Internal note about customer"),
      tags: z.string().optional().describe("Comma-separated customer tags")
    },
    async ({ first_name, last_name, email, phone, addresses, note, tags }) => {
      console.log("======== SHOPIFY CREATE CUSTOMER");
      console.log();
      console.log(JSON.stringify({ first_name, last_name, email, phone, addresses, note, tags }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const customerService = new CustomerService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const customerRequest: CreateCustomerRequest = {
        first_name,
        last_name,
        email,
        phone,
        addresses,
        note,
        tags
      };

      const result = await customerService.createCustomer(customerRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create customer: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: create_fulfillment
  // ---------------------------------------------------------------------------
  // Creates a fulfillment for an order (updates fulfillment status)
  server.tool(
    "create_fulfillment",
    "Create a fulfillment for an order to update its fulfillment status. Use to mark orders as shipped/fulfilled with tracking information.",
    {
      fulfillment_order_id: z.number().describe("Fulfillment order ID (required)"),
      tracking_company: z.string().optional().describe("Shipping carrier name"),
      tracking_number: z.string().optional().describe("Tracking number"),
      tracking_url: z.string().optional().describe("Tracking URL"),
      notify_customer: z.boolean().optional().describe("Send notification to customer (default: false)")
    },
    async ({ fulfillment_order_id, tracking_company, tracking_number, tracking_url, notify_customer }) => {
      console.log("======== SHOPIFY CREATE FULFILLMENT");
      console.log();
      console.log(JSON.stringify({ fulfillment_order_id, tracking_company, tracking_number, tracking_url, notify_customer }, null, 2));

      const shopifyService = createShopifyService(auth);
      if ('error' in shopifyService) {
        return {
          content: [{ type: "text", text: shopifyService.error }]
        };
      }

      const fulfillmentService = new FulfillmentService({
        accessToken: shopifyService['accessToken'],
        shopDomain: shopifyService['shopDomain']
      });

      const fulfillmentRequest = {
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id
          }
        ],
        tracking_info: tracking_company || tracking_number || tracking_url ? {
          company: tracking_company,
          number: tracking_number,
          url: tracking_url
        } : undefined,
        notify_customer
      };

      const result = await fulfillmentService.createFulfillment(fulfillmentRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create fulfillment: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // Return the configured server instance
  return server;
}

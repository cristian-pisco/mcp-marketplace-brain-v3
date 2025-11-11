import { ShopifyService } from "../services/shopify.service.ts";
import { AuthContext } from "../index.ts";

type ShopifyUserInfo = {
  sub: string;
  name: string;
  email: string;
};

function normalizeShopifyDomain(storeName: string): string {
  let domain = storeName.trim();
  if (!domain) {
    throw new Error('El nombre de la tienda no puede estar vacío');
  }

  domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (domain.endsWith('.myshopify.com')) {
    const shopName = domain.replace('.myshopify.com', '');
    if (!isValidShopName(shopName)) {
      throw new Error('Nombre de tienda inválido');
    }
    return domain;
  }

  if (!isValidShopName(domain)) {
    throw new Error('Nombre de tienda inválido');
  }
  return `${domain}.myshopify.com`;
}

function isValidShopName(name: string): boolean {
  // Shopify permite letras, números, guiones y puntos
  // Debe tener al menos 1 caracter
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9\.-]*[a-zA-Z0-9]$/;
  return regex.test(name) && name.length >= 1;
}

/**
 * Creates a Shopify service instance from the authentication context
 * @param auth - Authentication context containing accessToken and shop domain
 * @returns ShopifyService instance or error object
 */
export function createShopifyService(
  auth?: AuthContext
): ShopifyService | { error: string } {
  console.log("======== CREATING SHOPIFY SERVICE");
  console.log("Auth Context:", JSON.stringify(auth, null, 2));

  // Check if authentication is valid
  if (!auth?.valid) {
    console.error("❌ Authentication is not valid");
    return {
      error: auth?.error ||
        "Authentication required. Please authenticate with Shopify first.",
    };
  }

  // Check if access token is present
  if (!auth.accessToken) {
    console.error("❌ Access token is missing");
    return {
      error: "Access token is required but was not provided.",
    };
  }

  // Get shop domain from headers or environment
  const shopDomain = (auth.headers?.["x-mkp-shopify-domain"] || (auth.metadata?.userInfo as ShopifyUserInfo)?.name) as string;

  if (!shopDomain) {
    console.error("❌ Shop domain is missing");
    return {
      error: "Shopify domain is required. Please provide the shop domain in the x-mkp-shopify-domain header.",
    };
  }

  const normalizedShopDomain = normalizeShopifyDomain(shopDomain);

  console.log("✅ Creating Shopify service for shop:", normalizedShopDomain);

  // Create and return the Shopify service
  return new ShopifyService({
    accessToken: auth.accessToken,
    shopDomain: normalizedShopDomain,
  });
}

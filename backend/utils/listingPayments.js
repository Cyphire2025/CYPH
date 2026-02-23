// utils/listingPayments.js

export const LISTING_PAYMENT_CONFIG = Object.freeze({
  sponsorship: Object.freeze({
    basic_boost: Object.freeze({
      amountInr: 1000,
      purpose: "sponsorship_basic_boost",
    }),
    premium: Object.freeze({
      amountInr: 2000,
      purpose: "sponsorship_premium",
    }),
  }),
});

export function normalizeListingCategory(input) {
  if (Array.isArray(input)) {
    const first = input.find((item) => typeof item === "string" && item.trim());
    return first ? first.trim().toLowerCase() : "";
  }
  if (typeof input === "string") return input.trim().toLowerCase();
  return "";
}

export function getListingPaymentConfig(category, listingPlan) {
  const cat = normalizeListingCategory(category);
  const plan = typeof listingPlan === "string" ? listingPlan.trim().toLowerCase() : "";
  if (!cat || !plan) return null;
  return LISTING_PAYMENT_CONFIG[cat]?.[plan] || null;
}

export function requiresListingPayment(category, listingPlan) {
  return !!getListingPaymentConfig(category, listingPlan);
}

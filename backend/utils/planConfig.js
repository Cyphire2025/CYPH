// utils/planConfig.js

export const PLAN_CONFIG = Object.freeze({
  free: { amountInr: 0, durationDays: 0 },
  plus: { amountInr: 499, durationDays: 30 },
  ultra: { amountInr: 1499, durationDays: 30 },
});

export const PAID_PLANS = Object.freeze(["plus", "ultra"]);

export function getPlanConfig(plan) {
  if (typeof plan !== "string") return null;
  return PLAN_CONFIG[plan.toLowerCase()] || null;
}

export function isPaidPlan(plan) {
  return PAID_PLANS.includes(String(plan || "").toLowerCase());
}

export function getPlanDurationMs(plan) {
  const config = getPlanConfig(plan);
  if (!config || !config.durationDays) return 0;
  return config.durationDays * 24 * 60 * 60 * 1000;
}

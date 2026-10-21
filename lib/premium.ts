export const PLANS = ["monthly", "yearly"] as const;
export type Plan = (typeof PLANS)[number];

export const isPlan = (x: unknown): x is Plan => PLANS.includes(x as Plan);

export function isPremium(premiumUntil: string | null | undefined, now: Date = new Date()): boolean {
  return !!premiumUntil && new Date(premiumUntil).getTime() > now.getTime();
}

type SubscriptionLike = {
  status: string;
  current_period_end?: number;
  items?: { data: { current_period_end?: number }[] };
};

/** Premium traje do kraja plaćenog razdoblja dok je pretplata aktivna; inače nema. */
export function premiumUntilFromSubscription(sub: SubscriptionLike): string | null {
  if (!["active", "trialing", "past_due"].includes(sub.status)) return null;
  // novije Stripe verzije API-ja drže period na stavci pretplate, starije na pretplati
  const end = sub.current_period_end ?? sub.items?.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

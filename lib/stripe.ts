import Stripe from "stripe";
import type { Plan } from "@/lib/premium";

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export const priceId = (plan: Plan) => (plan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY! : process.env.STRIPE_PRICE_YEARLY!);

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

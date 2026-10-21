"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlan } from "@/lib/premium";
import { priceId, siteUrl, stripe } from "@/lib/stripe";

async function currentProfile() {
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) throw new Error("Nema prijave");
  const { data } = await createAdminClient().from("profiles").select("stripe_customer_id").eq("id", auth.user.id).single();
  return { userId: auth.user.id, customerId: (data?.stripe_customer_id as string | null) ?? undefined };
}

export async function startCheckout(formData: FormData) {
  const plan = formData.get("plan");
  if (!isPlan(plan)) throw new Error("Nepoznat plan");
  const { userId, customerId } = await currentProfile();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId(plan), quantity: 1 }],
    client_reference_id: userId,
    customer: customerId,
    subscription_data: { metadata: { user_id: userId } },
    success_url: `${siteUrl()}/premium?uspjeh=1`,
    cancel_url: `${siteUrl()}/premium`,
  });
  redirect(session.url!);
}

export async function openPortal() {
  const { customerId } = await currentProfile();
  if (!customerId) redirect("/premium");
  const session = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${siteUrl()}/premium` });
  redirect(session.url);
}

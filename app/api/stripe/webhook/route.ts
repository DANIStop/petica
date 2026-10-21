import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { premiumUntilFromSubscription } from "@/lib/premium";

export const runtime = "nodejs";

async function userIdForSubscription(db: ReturnType<typeof createAdminClient>, sub: Stripe.Subscription) {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data } = await db.from("profiles").select("id").eq("stripe_customer_id", customer).maybeSingle();
  return data?.id as string | undefined;
}

async function handle(event: Stripe.Event, db: ReturnType<typeof createAdminClient>) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription" || !session.client_reference_id || !session.subscription) return;
    const sub = await stripe().subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
    await db
      .from("profiles")
      .update({
        stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
        premium_until: premiumUntilFromSubscription(sub),
      })
      .eq("id", session.client_reference_id);
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = await userIdForSubscription(db, sub);
    if (!userId) throw new Error(`Nepoznat korisnik za pretplatu ${sub.id}`);
    const until = event.type === "customer.subscription.deleted" ? null : premiumUntilFromSubscription(sub);
    await db.from("profiles").update({ premium_until: until }).eq("id", userId);
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Nema potpisa", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Neispravan potpis", { status: 400 });
  }

  const db = createAdminClient();
  // idempotentnost: događaj se obrađuje samo jednom (primarni ključ = event.id)
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id });
  if (dup) {
    if (dup.code === "23505") return Response.json({ received: true, duplicate: true });
    return new Response("Baza nedostupna", { status: 500 }); // Stripe će ponoviti
  }

  try {
    await handle(event, db);
  } catch (e) {
    // omogući da Stripe ponovi isporuku
    await db.from("stripe_events").delete().eq("id", event.id);
    return new Response(e instanceof Error ? e.message : "Greška", { status: 500 });
  }
  return Response.json({ received: true });
}

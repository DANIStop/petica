"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Prvi posjet: tihi anonymous sign-in, bez forme.
export default function AnonSignIn() {
  const router = useRouter();
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; // lokalni razvoj bez Supabasea
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (!error) router.refresh();
    });
  }, [router]);
  return null;
}

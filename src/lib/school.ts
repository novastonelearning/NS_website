import type { School } from "@/components/CoBrandHeader";
import type { createClient } from "@/lib/supabase/server";

// The signed-in person's own school, read with their session: RLS only ever
// returns their institution's row, so no filter is needed (or possible).
export async function currentSchool(supabase: Awaited<ReturnType<typeof createClient>>): Promise<School | null> {
  const { data } = await supabase.from("institutions").select("name, short_name, logo_url").maybeSingle();
  return data ? { name: data.name, shortName: data.short_name, logoUrl: data.logo_url } : null;
}

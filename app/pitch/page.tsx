import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";

export default async function PitchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) redirect("/home");

  redirect("/pitch.html");
}

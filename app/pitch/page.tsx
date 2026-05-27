import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";

export default async function PitchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) redirect("/home");

  return (
    <main className="flex-1 overflow-hidden">
      <iframe
        src="/pitch.html"
        className="w-full h-full border-0"
        title="Hinilas Pro Investor Teaser"
        allow="fullscreen"
      />
    </main>
  );
}

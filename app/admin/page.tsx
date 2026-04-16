import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isOwnerUser(user)) {
    redirect("/");
  }

  return <AdminDashboardClient />;
}

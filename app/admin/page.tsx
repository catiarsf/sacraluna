import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getSession();

  // ❌ não está logada
  if (!session?.user) {
    redirect("/admin-login");
  }

  // ❌ não é admin
  if (session.user.role !== "admin") {
    redirect("/admin-login");
  }

  // ✅ é admin → entra no painel real
  return <AdminClient />;
}
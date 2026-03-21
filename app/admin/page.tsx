import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const cookieStore = await cookies();

  const consultorId = cookieStore.get("consultor_id")?.value;
  const consultorRole = cookieStore.get("consultor_role")?.value;

  if (!consultorId) {
    redirect("/login-consultor");
  }

  if (consultorRole !== "admin") {
    redirect("/");
  }

  return <AdminClient />;
}
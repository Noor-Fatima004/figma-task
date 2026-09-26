import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "admin") {
    redirect("/"); // logged in, but not an admin — bounce to the regular home page
  }

  return (
    <AdminShell name={currentUser.name} email={currentUser.email}>
      {children}
    </AdminShell>
  );
}
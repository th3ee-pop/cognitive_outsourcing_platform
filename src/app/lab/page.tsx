import { redirect } from "next/navigation";
import { LabApp } from "@/components/LabApp";
import { getSessionUser } from "@/lib/session";

export default async function LabPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/change-password");
  return <LabApp user={user} />;
}

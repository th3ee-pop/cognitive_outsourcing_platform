import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/AuthScreens";
import { getSessionUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.must_change_password) redirect("/lab");
  return <ChangePasswordForm />;
}

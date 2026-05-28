import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthScreens";
import { getSessionUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user?.must_change_password) redirect("/change-password");
  if (user) redirect("/lab");
  return <LoginForm />;
}

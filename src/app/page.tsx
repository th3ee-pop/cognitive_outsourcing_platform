import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/change-password");
  redirect("/lab");
}

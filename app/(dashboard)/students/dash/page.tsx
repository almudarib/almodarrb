import DashClient from "./DashClient";
import { clearSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/paths";

export default function Page() {
  async function logout(_formData: FormData) {
    "use server";
    await clearSession();
    redirect(LOGIN_PATH);
  }
  return <DashClient logoutAction={logout} />;
}

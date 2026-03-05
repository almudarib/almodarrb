import DashClient from "./DashClient";
import { getSession, clearSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/paths";
import {
  fetchStudent,
  countExams,
  countStudentCompletedExams,
  type Dict,
} from "@/actions/service";

export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect(LOGIN_PATH);
  }

  let exams = 0;
  let doneExams = 0;

  const stuRes = await fetchStudent(session.id);
  const language =
    (stuRes.ok ? ((stuRes.data as Dict | null)?.["language"] as string | undefined) : undefined) ??
    "AR";

  const totalRes = await countExams(language);
  if (totalRes.ok) exams = totalRes.data;

  const doneRes = await countStudentCompletedExams(session.id, language);
  if (doneRes.ok) doneExams = doneRes.data;

  async function logout() {
    "use server";
    await clearSession();
    redirect(LOGIN_PATH);
  }
  return <DashClient exams={exams} doneExams={doneExams} logoutAction={logout} />;
}

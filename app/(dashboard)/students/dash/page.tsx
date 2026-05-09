import DashClient from "./DashClient";
import { Suspense } from "react";
import { getSession, clearSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/paths";
import {
  fetchStudent,
  countExams,
  countStudentCompletedExams,
  type Dict,
} from "@/actions/service";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f7fa" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: 24, border: "1px solid #e5e7eb", color: "#1a365d" }}>
            جاري تحميل لوحة الطالب…
          </div>
        </div>
      }
    >
      <DashData />
    </Suspense>
  );
}

async function DashData() {
  const session = await getSession();
  if (!session) {
    redirect(LOGIN_PATH);
  }

  let exams = 0;
  let doneExams = 0;

  const stuRes = await fetchStudent(session.id);
  if (!stuRes.ok || !stuRes.data) {
    await clearSession();
    redirect(LOGIN_PATH);
  }
  const language =
    (stuRes.ok ? ((stuRes.data as Dict | null)?.["language"] as string | undefined) : undefined) ??
    "AR";

  const totalRes = await countExams(language);
  if (totalRes.ok) exams = totalRes.data;

  const doneRes = await countStudentCompletedExams(session.id, language);
  if (doneRes.ok) doneExams = Math.min(doneRes.data, exams);

  async function logout() {
    "use server";
    await clearSession();
    redirect(LOGIN_PATH);
  }
  return <DashClient exams={exams} doneExams={doneExams} logoutAction={logout} />;
}

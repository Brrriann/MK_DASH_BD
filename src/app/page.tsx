import { redirect } from "next/navigation";

// Root path — middleware will redirect unauthenticated users to /login,
// authenticated users get forwarded here and then redirected to /dashboard.
export default function Home() {
  redirect("/dashboard");
}

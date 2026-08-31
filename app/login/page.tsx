import { redirect } from "next/navigation";
import { getSessionPerson } from "@/lib/auth";
import { LoginFlow } from "./login-flow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in · myturn" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  if (await getSessionPerson()) redirect("/");
  const { expired } = await searchParams;
  return <LoginFlow expired={expired === "1"} />;
}

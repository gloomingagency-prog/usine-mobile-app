"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function seConnecter(formData: FormData) {
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const okUser = process.env.ADMIN_USER;
  const okPass = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET || process.env.CRON_SECRET;
  if (!okUser || !okPass || !secret) redirect("/login?erreur=config");
  if (user !== okUser || password !== okPass) redirect("/login?erreur=identifiants");

  const { token, exp } = await createSessionToken(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: new Date(exp),
    path: "/",
  });
  redirect("/");
}

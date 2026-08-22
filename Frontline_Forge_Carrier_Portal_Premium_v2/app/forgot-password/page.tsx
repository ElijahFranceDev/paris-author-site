"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/change-password`;
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error ? error.message : "Password reset email sent.");
  }
  return <main className="auth-shell"><section className="auth-brand"><div className="logo-large">FFS</div><h1>Reset portal access.</h1></section><section className="auth-panel"><div className="auth-card card"><h2>Forgot password</h2><form className="form" onSubmit={submit}>{message && <div className="alert">{message}</div>}<label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><button className="button secondary">Send reset link</button><Link href="/login" className="muted">Return to login</Link></form></div></section></main>;
}

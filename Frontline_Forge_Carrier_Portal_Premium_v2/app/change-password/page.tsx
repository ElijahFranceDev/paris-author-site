"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) await supabase.rpc("mark_password_changed");
    if (error) { setMessage(error.message); setLoading(false); return; }
    window.location.href = "/dashboard";
  }
  return <main className="auth-shell"><section className="auth-brand"><div className="logo-large">FFS</div><h1>Protect your carrier records.</h1><p>Create a private password that is not reused anywhere else.</p></section><section className="auth-panel"><div className="auth-card card"><h2>Change password</h2><form className="form" onSubmit={submit}>{message && <div className="alert error">{message}</div>}<label>New password<input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="button secondary" disabled={loading}>{loading ? "Saving..." : "Save password"}</button></form></div></section></main>;
}

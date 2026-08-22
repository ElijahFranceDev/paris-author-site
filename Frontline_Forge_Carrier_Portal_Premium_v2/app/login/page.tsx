"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="logo-large">FFS</div>
        <div className="eyebrow" style={{ marginTop: 30 }}>Premium carrier operations</div>
        <h1>One portal for loads, documents, fleet records, reports, invoices, fuel, mileage, and support.</h1>
        <p>Secure, invite-only access for Frontline Forge Solutions carriers and drivers.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card card">
          <h2>Carrier Command Portal</h2>
          <p className="muted">Sign in with your FFS-issued portal credentials.</p>
          <form className="form" onSubmit={submit}>
            {error && <div className="alert error">{error}</div>}
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="button secondary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
            <Link href="/forgot-password" className="muted">Forgot your password?</Link>
          </form>
        </div>
      </section>
    </main>
  );
}

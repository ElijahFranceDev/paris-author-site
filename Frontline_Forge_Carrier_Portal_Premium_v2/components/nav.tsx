import Link from "next/link";
import type { Profile } from "@/lib/types";
import { SignOutButton } from "@/components/sign-out-button";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export function Nav({ profile }: { profile: Profile }) {
  const staff = profile.role === "admin" || profile.role === "dispatcher";
  return (
    <>
      <RealtimeRefresh />
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">FFS</span>
          <span><strong>Frontline Forge Solutions</strong><small>Carrier Command Portal</small></span>
        </Link>
        <nav className="navlinks">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/loads">Loads</Link>
          <Link href="/fleet">Fleet</Link>
          <Link href="/documents">Documents</Link>
          {profile.role !== "driver" && <Link href="/reports">Reports</Link>}
          {profile.role !== "driver" && <Link href="/invoices">Invoices</Link>}
          <Link href="/fuel-mileage">Fuel & Mileage</Link>
          <Link href="/support">Support</Link>
          <Link href="/profile">Profile</Link>
          {staff && <Link href="/admin">Admin</Link>}
        </nav>
        <div className="userbox">
          <span><strong>{profile.full_name}</strong><small>{profile.role.replace("_", " ")}</small></span>
          <SignOutButton />
        </div>
      </header>
    </>
  );
}

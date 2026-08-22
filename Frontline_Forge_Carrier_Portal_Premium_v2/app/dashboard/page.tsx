import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";
import {
  money,
  formatPortalDateTime,
} from "@/lib/utils";

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();
  const carrierFilter = profile.carrier_id;

  const loadsQuery = supabase.from("loads").select("*").order("date_booked", { ascending: false });
  if (carrierFilter) loadsQuery.eq("carrier_id", carrierFilter);
  const { data: loadsData } = await loadsQuery;
  const loads = loadsData || [];
  const active = loads.filter((load) => load.counts_toward_revenue);
  const financialAccess = profile.role !== "driver";
  const gross = financialAccess ? active.reduce((sum, load) => sum + Number(load.rate || 0), 0) : 0;
  const fees = financialAccess ? active.reduce((sum, load) => sum + Number(load.rate || 0) * Number(load.fee_rate || 0), 0) : 0;
  const loadedMiles = active.reduce((sum, load) => sum + Number(load.miles_loaded || 0), 0);
  const deadheadMiles = active.reduce((sum, load) => sum + Number(load.miles_deadhead || 0), 0);

  const fuelQuery = supabase.from("fuel_entries").select("amount, gallons");
  if (carrierFilter) fuelQuery.eq("carrier_id", carrierFilter);
  const { data: fuelData } = await fuelQuery;
  const fuelCost = (fuelData || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const invoiceQuery = supabase.from("invoices").select("id, total, status").eq("status", "open");
  if (carrierFilter) invoiceQuery.eq("carrier_id", carrierFilter);
  const { data: invoiceData } = await invoiceQuery;
  const openInvoices = (invoiceData || []).reduce((sum, row) => sum + Number(row.total || 0), 0);

  const notificationQuery = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(6);
  if (carrierFilter) notificationQuery.eq("carrier_id", carrierFilter);
  const { data: notificationsData } = await notificationQuery;

  const activityQuery = supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8);
  if (carrierFilter) activityQuery.eq("carrier_id", carrierFilter);
  const { data: activityData } = await activityQuery;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = loads.filter((load) => load.delivery_date >= today && !["Delivered", "Canceled", "Not Taken"].includes(load.status)).slice(0, 6);

  return <><Nav profile={profile}/><main className="container">
    <div className="page-head"><div><div className="eyebrow">Premium operations overview</div><h1>Welcome, {profile.full_name.split(" ")[0]}</h1></div><div className="page-actions"><Link className="button" href="/reports">Generate report</Link><Link className="button secondary" href="/support">Contact FFS</Link></div></div>
    <section className="grid kpis">
      <div className="card kpi"><div className="kpi-label">Loads recorded</div><div className="kpi-value">{loads.length}</div></div>
      <div className="card kpi"><div className="kpi-label">{financialAccess ? "Active gross" : "Assigned active loads"}</div><div className="kpi-value">{financialAccess ? money.format(gross) : active.length}</div></div>
      <div className="card kpi"><div className="kpi-label">{financialAccess ? "Load fees" : "Upcoming deliveries"}</div><div className="kpi-value">{financialAccess ? money.format(fees) : upcoming.length}</div></div>
      <div className="card kpi"><div className="kpi-label">Loaded miles</div><div className="kpi-value">{loadedMiles.toLocaleString()}</div></div>
      <div className="card kpi"><div className="kpi-label">Fuel cost</div><div className="kpi-value">{money.format(fuelCost)}</div></div>
      <div className="card kpi"><div className="kpi-label">Open invoices</div><div className="kpi-value">{money.format(openInvoices)}</div></div>
    </section>
    <div className="metric-strip section"><span>Deadhead miles: {deadheadMiles.toLocaleString()}</span>{financialAccess && <span>Average load: {money.format(active.length ? gross / active.length : 0)}</span>}{financialAccess && <span>Revenue per loaded mile: {money.format(loadedMiles ? gross / loadedMiles : 0)}</span>}</div>
    <section className="grid two-col section">
      <div><h2>Upcoming and active loads</h2><div className="table-wrap"><table><thead><tr><th>Load</th><th>Lane</th><th>Dates</th><th>Rate</th><th>Status</th></tr></thead><tbody>{upcoming.map((load) => <tr key={load.id}><td><Link href={`/loads/${load.id}`}><strong>{load.load_number}</strong></Link><br/><span className="muted">{load.broker}</span></td><td>{load.pickup_location} → {load.delivery_location}</td><td>{load.pickup_date}<br/>{load.delivery_date}</td><td>{financialAccess ? money.format(Number(load.rate || 0)) : "Carrier controlled"}</td><td><span className="badge">{load.status}</span></td></tr>)}{!upcoming.length && <tr><td colSpan={5} className="empty">No upcoming loads.</td></tr>}</tbody></table></div></div>
      <aside className="grid"><div><h2>Portal notifications</h2><div className="grid">{(notificationsData || []).map((n) => <Link href={n.link || "/dashboard"} className={`card notification ${n.read_at ? "" : "unread"}`} key={n.id}><strong>{n.title}</strong><p className="muted">{n.message}</p></Link>)}{!(notificationsData || []).length && <div className="card muted">No notifications.</div>}</div></div><div><h2>Quick access</h2><div className="quick-links"><Link href="/documents">Upload or open documents</Link><Link href="/fuel-mileage">Record fuel and mileage</Link>{financialAccess && <Link href="/invoices">View dispatch invoices</Link>}<Link href="/fleet">Manage trucks and drivers</Link></div></div></aside>
    </section>
    <section className="section"><h2>Recent activity</h2><div className="timeline">{(activityData || []).map((item) => <div className="timeline-item" key={item.id}><strong>{item.action}</strong><div className="muted">{item.entity_type} · {formatPortalDateTime(item.created_at)}</div></div>)}{!(activityData || []).length && <div className="card muted">Activity will appear here as records are updated.</div>}</div></section>
  </main><footer>Frontline Forge Solutions provides carrier support and does not act as a freight broker.</footer></>;
}

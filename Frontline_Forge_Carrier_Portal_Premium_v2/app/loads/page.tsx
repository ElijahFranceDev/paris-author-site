import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { money } from "@/lib/utils";

export default async function LoadsPage() {
  const { supabase, profile } = await requireProfile();
  const { data: loadsData } = await supabase.from("loads").select("*").order("date_booked", { ascending: false });
  const loads = loadsData || [];
  const financialAccess = profile.role !== "driver";
  return <><Nav profile={profile}/><main className="container"><div className="page-head"><div><div className="eyebrow">Complete carrier record</div><h1>Load History</h1></div></div><div className="table-wrap"><table><thead><tr><th>Load</th><th>Broker / PO</th><th>Dispatcher</th><th>Pickup</th><th>Delivery</th><th>Miles</th>{financialAccess && <th>Rate</th>}{financialAccess && <th>Fee</th>}<th>Status</th></tr></thead><tbody>{loads.map((load) => <tr key={load.id} className={!load.counts_toward_revenue ? "not-taken" : ""}><td><Link href={`/loads/${load.id}`}><strong>{load.load_number}</strong></Link><br/><span className="muted">Booked {load.date_booked}</span></td><td>{load.broker}<br/><span className="muted">{load.broker_load_number || "No PO entered"}</span></td><td>{load.dispatcher_name || "—"}<br/><span className="muted">{Number(load.dispatcher_fee_percent || 0).toFixed(2)}%</span></td><td>{load.pickup_location}<br/><span className="muted">{load.pickup_date} {load.pickup_time || ""}</span></td><td>{load.delivery_location}<br/><span className="muted">{load.delivery_date} {load.delivery_time || ""}</span></td><td>{Number(load.miles_loaded || 0).toLocaleString()} loaded<br/><span className="muted">{Number(load.miles_deadhead || 0).toLocaleString()} deadhead</span></td>{financialAccess && <td>{money.format(Number(load.rate || 0))}</td>}{financialAccess && <td>{money.format(load.counts_toward_revenue ? Number(load.rate || 0) * Number(load.fee_rate || 0) : 0)}</td>}<td><span className={`badge ${!load.counts_toward_revenue ? "danger" : load.status === "Delivered" ? "success" : ""}`}>{load.status}</span></td></tr>)}{!loads.length && <tr><td colSpan={financialAccess ? 9 : 7} className="empty">No loads recorded.</td></tr>}</tbody></table></div></main></>;
}

import { requireProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { generateReport } from "./actions";
import { money } from "@/lib/utils";

export default async function ReportsPage() {
  const { supabase, profile } = await requireProfile();
  const { data: reportsData } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  const reports = reportsData || [];
  const withLinks = await Promise.all(reports.map(async (report) => ({ ...report, signedUrl: (await supabase.storage.from("carrier-documents").createSignedUrl(report.storage_path, 900)).data?.signedUrl || null })));
  const { data: carriersData } = ["admin","dispatcher"].includes(profile.role) ? await supabase.from("carriers").select("id, company_name").order("company_name") : { data: [] };
  const now = new Date(); const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0,10); const today = now.toISOString().slice(0,10);
  return <><Nav profile={profile}/><main className="container"><div className="page-head"><div><div className="eyebrow">Automated and on-demand</div><h1>Operations Reports</h1></div></div><section className="grid two-col"><div><h2>Report archive</h2><div className="grid">{withLinks.map(report=><div className="card" key={report.id}><div className="eyebrow">{report.report_type}</div><h2>{report.title}</h2><div className="metric-strip"><span>{report.total_loads} loads</span><span>{money.format(Number(report.gross_revenue || 0))} gross</span><span>{money.format(Number(report.fee_total || 0))} fees</span></div><p className="muted">{report.period_start} through {report.period_end}</p>{report.signedUrl && <a className="button" href={report.signedUrl} target="_blank" rel="noreferrer">Download PDF</a>}</div>)}{!withLinks.length && <div className="card muted">No reports generated yet.</div>}</div></div><aside className="card"><h2>Generate report now</h2><form action={generateReport} className="form">{["admin","dispatcher"].includes(profile.role) && <label>Carrier<select name="carrier_id" required>{(carriersData || []).map(c=><option value={c.id} key={c.id}>{c.company_name}</option>)}</select></label>}<label>Report type<select name="report_type"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></label><label>Start date<input type="date" name="start_date" defaultValue={first} required/></label><label>End date<input type="date" name="end_date" defaultValue={today} required/></label><button className="button secondary">Generate premium PDF</button></form><p className="muted">Vercel cron jobs also generate enabled weekly and monthly reports automatically.</p></aside></section></main></>;
}

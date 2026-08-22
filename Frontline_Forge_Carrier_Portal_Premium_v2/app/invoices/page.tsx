import { requireProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { generateInvoice } from "./actions";
import { money } from "@/lib/utils";

export default async function InvoicesPage() {
  const { supabase, profile } = await requireProfile();
  const { data: invoicesData } = await supabase.from("invoices").select("*").order("issue_date", { ascending: false });
  const invoices = invoicesData || [];
  const withLinks = await Promise.all(invoices.map(async (invoice) => ({ ...invoice, signedUrl: invoice.storage_path ? (await supabase.storage.from("carrier-documents").createSignedUrl(invoice.storage_path, 900)).data?.signedUrl || null : null })));
  const { data: carriersData } = ["admin","dispatcher"].includes(profile.role) ? await supabase.from("carriers").select("id, company_name").order("company_name") : { data: [] };
  const staff = ["admin","dispatcher"].includes(profile.role);
  return <><Nav profile={profile}/><main className="container"><div className="page-head"><div><div className="eyebrow">Dispatch billing records</div><h1>Invoices</h1></div></div><section className="grid two-col"><div><h2>Invoice archive</h2><div className="grid">{withLinks.map(invoice=><div className="card" key={invoice.id}><div className="eyebrow">{invoice.invoice_number}</div><h2>{money.format(Number(invoice.total || 0))}</h2><p>{invoice.period_start} through {invoice.period_end}<br/>Due {invoice.due_date}</p><span className={`badge ${invoice.status === "paid" ? "success" : ""}`}>{invoice.status}</span>{invoice.signedUrl && <div className="section"><a className="button" href={invoice.signedUrl} target="_blank" rel="noreferrer">Open invoice PDF</a></div>}</div>)}{!withLinks.length && <div className="card muted">No invoices generated.</div>}</div></div>{staff && <aside className="card"><h2>Generate dispatch invoice</h2><form action={generateInvoice} className="form"><label>Carrier<select name="carrier_id" required>{(carriersData || []).map(c=><option value={c.id} key={c.id}>{c.company_name}</option>)}</select></label><label>Period start<input type="date" name="start_date" required/></label><label>Period end<input type="date" name="end_date" required/></label><label>Due date<input type="date" name="due_date" required/></label><button className="button secondary">Generate invoice and PDF</button></form></aside>}</section></main></>;
}

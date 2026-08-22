import { requireProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { uploadDocument } from "./actions";

export default async function DocumentsPage() {
  const { supabase, profile } = await requireProfile();
  const { data: documentsData } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
  const documents = documentsData || [];
  const withLinks = await Promise.all(documents.map(async (doc) => {
    const { data } = await supabase.storage.from("carrier-documents").createSignedUrl(doc.storage_path, 900);
    return { ...doc, signedUrl: data?.signedUrl || null };
  }));
  const { data: loadsData } = await supabase.from("loads").select("id, load_number").order("date_booked", { ascending: false });
  const { data: carriersData } = ["admin","dispatcher"].includes(profile.role) ? await supabase.from("carriers").select("id, company_name").order("company_name") : { data: [] };
  const expiring = documents.filter((doc) => doc.expires_on && new Date(doc.expires_on).getTime() <= Date.now() + 30 * 86400000);
  return <><Nav profile={profile}/><main className="container"><div className="page-head"><div><div className="eyebrow">Private document center</div><h1>Documents</h1></div></div>{expiring.length > 0 && <div className="alert error">{expiring.length} document(s) expire within 30 days or are already expired.</div>}
    <section className="grid two-col"><div><h2>Document library</h2><div className="grid">{withLinks.map(doc=><div className="card" key={doc.id}><div className="eyebrow">{doc.document_type}</div><h2>{doc.title}</h2><p className="muted">Added {new Date(doc.created_at).toLocaleString()}{doc.expires_on ? ` · Expires ${doc.expires_on}` : ""}</p>{doc.signedUrl && <a className="button" href={doc.signedUrl} target="_blank" rel="noreferrer">Open secure document</a>}</div>)}{!withLinks.length && <div className="card muted">No documents yet.</div>}</div></div><aside className="card"><h2>Upload document</h2><form action={uploadDocument} className="form" encType="multipart/form-data">{["admin","dispatcher"].includes(profile.role) && <label>Carrier<select name="carrier_id" required>{(carriersData || []).map(c=><option value={c.id} key={c.id}>{c.company_name}</option>)}</select></label>}<label>Load (optional)<select name="load_id"><option value="">Company-level document</option>{(loadsData || []).map(load=><option value={load.id} key={load.id}>{load.load_number}</option>)}</select></label><label>Document type<select name="document_type">{(profile.role === "driver" ? ["BOL","POD","Receipt"] : ["Rate Confirmation","BOL","POD","Carrier Report","Dispatch Invoice","Insurance","W-9","Carrier Packet","Factoring","Agreement","Receipt","Other"]).map(v=><option key={v}>{v}</option>)}</select></label><label>Title<input name="title" placeholder="Document title"/></label><label>Expiration date (optional)<input type="date" name="expires_on"/></label><label>File<input type="file" name="file" required/></label><button className="button secondary">Upload securely</button></form></aside></section>
  </main></>;
}

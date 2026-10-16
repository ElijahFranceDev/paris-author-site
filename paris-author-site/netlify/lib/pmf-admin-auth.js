"use strict";
const crypto = require("node:crypto");
const COOKIE = "pmf_store_admin";
const TTL = 60 * 60 * 6;
const json = (statusCode, data, headers = {}) => ({
  statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store, no-cache, must-revalidate", "X-Content-Type-Options": "nosniff", ...headers }, body: JSON.stringify(data)
});
const ready = () => Boolean(process.env.PMF_ADMIN_PASSWORD_HASH && process.env.PMF_ADMIN_SESSION_SECRET && process.env.PMF_ADMIN_SESSION_SECRET.length >= 32);
const safeEqual = (a,b) => {
  const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));
  return x.length===y.length && crypto.timingSafeEqual(x,y);
};
const verifyPassword = (password) => {
  if (!ready() || typeof password!=="string" || password.length>256) return false;
  const parts=process.env.PMF_ADMIN_PASSWORD_HASH.split(":");
  if(parts.length!==3 || parts[0]!=="scrypt" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const derived=crypto.scryptSync(password,Buffer.from(parts[1],"hex"),64).toString("hex");
  return safeEqual(derived,parts[2]);
};
const sign = (text) => crypto.createHmac("sha256",process.env.PMF_ADMIN_SESSION_SECRET).update(text).digest("hex");
const createCookie = () => {
  const exp=Math.floor(Date.now()/1000)+TTL;
  const body=String(exp)+"."+crypto.randomBytes(16).toString("hex");
  return COOKIE+"="+body+"."+sign(body)+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+TTL;
};
const clearCookie = () => COOKIE+"=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
const authorized = (event) => {
  if (!ready()) return false;
  const cookies=String(event.headers?.cookie||event.headers?.Cookie||"");
  const match=cookies.split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));
  if (!match) return false;
  const token=match.slice((COOKIE+"=").length);
  const parts=token.split(".");
  if (parts.length!==3 || !/^\d{10}$/.test(parts[0]) || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expiry=Number(parts[0]),now=Math.floor(Date.now()/1000);
  return expiry>now && expiry<=now+TTL && safeEqual(sign(parts[0]+"."+parts[1]),parts[2]);
};
const sameOrigin = (event) => {
  const origin=event.headers?.origin||event.headers?.Origin;
  const host=event.headers?.["x-forwarded-host"]||event.headers?.host||event.headers?.Host;
  if (!origin||!host) return false;
  try {
    const u=new URL(origin);
    return u.protocol==="https:" && u.host.toLowerCase()===String(host).split(",")[0].trim().toLowerCase();
  } catch {return false;}
};
const reject = (event) => !authorized(event) ? json(401,{error:"Sign in to your bookstore dashboard."}) :
  !sameOrigin(event) ? json(403,{error:"Invalid request origin."}) : null;
module.exports={json,ready,authorized,verifyPassword,createCookie,clearCookie,sameOrigin,reject};

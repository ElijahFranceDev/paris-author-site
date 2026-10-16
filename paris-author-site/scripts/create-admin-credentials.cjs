// Run once locally: node scripts/create-admin-credentials.cjs
// Copy the generated admin hash and session secret to private Netlify environment variables.
// Store the generated password in your password manager; never commit this output.
const crypto=require("node:crypto");
const password=crypto.randomBytes(18).toString("base64url");
const salt=crypto.randomBytes(16);
const hash=crypto.scryptSync(password,salt,64).toString("hex");
const secret=crypto.randomBytes(48).toString("base64url");
console.log("=== P.M. FRANCE PRIVATE STORE ADMIN ===\n");
console.log("Admin login password (save privately):\n"+password+"\n");
console.log("Netlify environment variable: PMF_ADMIN_PASSWORD_HASH\n"+
  "scrypt:"+salt.toString("hex")+":"+hash+"\n");
console.log("Netlify environment variable: PMF_ADMIN_SESSION_SECRET\n"+secret+"\n");
console.log("Keep these private. Don't share passwords or secrets in chat or source control.");

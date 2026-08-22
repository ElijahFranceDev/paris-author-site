FFS DELETE PORTAL USER PATCH

1. Open this extracted patch folder.
2. Copy the included "app" folder.
3. Paste it into your local Frontline_Forge_Carrier_Portal_Premium_v2 project folder.
4. Choose "Replace the files in the destination" when Windows asks.
5. In Command Prompt inside the project folder, run:
   npm run build
6. After the build passes, run:
   npx vercel --prod

The new Admin section deletes only the selected portal login/profile.
It does NOT delete the carrier, loads, documents, trucks, invoices, or reports.
Administrator accounts and your own current admin login are protected.

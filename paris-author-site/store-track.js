(() => {
  const orderField = document.getElementById("track-order"), emailField = document.getElementById("track-email");
  const result = document.getElementById("track-result"), error = document.getElementById("track-error");
  orderField.value = new URLSearchParams(location.search).get("order") || "";
  const labels = { received:"Order received", preordered:"Preorder received", preparing:"Preparing for shipment", shipped:"Shipped", delivered:"Delivered", cancelled:"Cancelled" };
  document.getElementById("track-form").addEventListener("submit", async (e) => {
    e.preventDefault();result.hidden = true;error.textContent = "Checking your order…";
    try {
      const response = await fetch("/.netlify/functions/order-status", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order:orderField.value.trim(),email:emailField.value.trim()})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to find order");
      error.textContent = "";result.hidden = false;
      document.getElementById("track-status").textContent = labels[data.status] || "Order received";
      document.getElementById("track-placed").textContent = "Placed " + new Date(data.placedAt).toLocaleDateString();
      const items = document.getElementById("track-items");items.replaceChildren(...data.items.map(i => {
        const p = document.createElement("p");p.textContent = i.quantity + " × " + i.name;return p;
      }));
      const shipping = document.getElementById("track-shipment");shipping.replaceChildren();
      if (data.trackingNumber) {
        const p = document.createElement("p");p.textContent = (data.carrier || "Carrier") + " • " + data.trackingNumber;shipping.append(p);
        if (data.trackingUrl) {const a=document.createElement("a");a.className="btn secondary";a.href=data.trackingUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="View carrier tracking";shipping.append(a);}
      } else {const p=document.createElement("p");p.className="store-note";p.textContent="Tracking will appear after your package is dispatched.";shipping.append(p);}
    } catch (err) {error.textContent=err.message;}
  });
})();
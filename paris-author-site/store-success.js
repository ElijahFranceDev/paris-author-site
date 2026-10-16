(async () => {
  const title = document.getElementById("success-title"), message = document.getElementById("success-message");
  const session_id = new URLSearchParams(location.search).get("session_id");
  if (!session_id) { title.textContent = "No order was found";message.textContent = "Please return to the bookstore or check your payment receipt.";return; }
  try {
    const response = await fetch("/.netlify/functions/verify-checkout", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id})});
    const data = await response.json();
    if (!response.ok || !data.paid) {title.textContent = "Payment not confirmed";message.textContent = data.error || "If you were charged, contact the author with your receipt.";return;}
    title.textContent = "Your order is confirmed";
    message.textContent = data.containsPreorder ? "Thank you for your preorder! We will fulfill it once the book and box are ready." : "Thank you for purchasing directly from P.M. France.";
    document.getElementById("success-order").hidden = false;
    document.getElementById("order-number").textContent = data.order;
    document.getElementById("tracking-link").href = "order-status.html?order=" + encodeURIComponent(data.order);
    document.getElementById("success-items").replaceChildren(...data.items.map(i => {
      const p = document.createElement("p");p.textContent = i.quantity + " × " + i.name;return p;
    }));
    document.getElementById("copy-order").addEventListener("click", async () => {
      try {await navigator.clipboard.writeText(data.order);document.getElementById("copy-order").textContent = "Copied!";}
      catch (_) {document.getElementById("copy-order").textContent = "Select and copy the reference above";}
    });
    // Clear cart only after the server confirms payment; never after a cancelled checkout.
    localStorage.removeItem("cart");
  } catch (_) {title.textContent = "We couldn't verify your order";message.textContent = "Please keep your payment receipt and contact the author if the issue continues.";}
})();
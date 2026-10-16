(() => {
  const tokenInput = document.getElementById("admin-token");
  const orders = document.getElementById("orders");
  const message = document.getElementById("admin-message");
  const statuses = ["received", "preordered", "preparing", "shipped", "delivered", "cancelled"];
  let token = "";
  const label = (v) => v.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const el = (tag, className, content) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (content !== undefined) e.textContent = content;
    return e;
  };
  async function request(payload) {
    const result = await fetch("/.netlify/functions/manage-orders", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload)
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  function field(parent, title, value = "") {
    const wrap = el("label", "store-field"), lbl = el("span", "", title), input = el("input", "");
    input.value = value;
    wrap.append(lbl, input);parent.append(wrap); return input;
  }
  function showOrder(item) {
    const card = el("article", "store-panel"), heading = el("h2", "", item.amount ? (item.amount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "Paid order");
    card.append(heading, el("p", "store-note", item.email), el("p", "store-note", "Order: " + item.order), el("p", "store-note", "Placed: " + new Date(item.created).toLocaleString()));
    if (item.containsPreorder) card.append(el("p", "store-highlight", "Contains preorder"));
    const statusLabel = el("label", "store-field", "Fulfillment status"), select = el("select", "");
    statuses.forEach(s => {const o = document.createElement("option");o.value = s;o.textContent = label(s);select.append(o);});
    select.value = item.status || "received";statusLabel.append(select);card.append(statusLabel);
    const carrier = field(card, "Carrier", item.carrier);
    const tracking = field(card, "Tracking number", item.trackingNumber);
    const url = field(card, "HTTPS tracking link", item.trackingUrl);
    const save = el("button", "btn primary", "Save status"), msg = el("p", "store-note");
    save.type = "button";
    save.addEventListener("click", async () => {
      save.disabled = true; msg.textContent = "Saving…";
      try {
        await request({action:"update",order:item.order,status:select.value,carrier:carrier.value,trackingNumber:tracking.value,trackingUrl:url.value});
        msg.textContent = "Saved. Reader tracking will now show this status.";
      } catch (err) {msg.textContent = err.message;} finally {save.disabled = false;}
    });
    card.append(save,msg); return card;
  }
  document.getElementById("load-orders").addEventListener("click", async () => {
    token = tokenInput.value;
    tokenInput.value = ""; orders.replaceChildren(); message.textContent = "Loading paid bookstore orders…";
    try {
      const data = await request({ action:"list" });
      message.textContent = data.orders.length + " paid bookstore orders found." + (data.hasMore ? " Older orders remain in Stripe." : "");
      for (const o of data.orders) orders.append(showOrder(o));
    } catch (err) {message.textContent = err.message;}
  });
})();
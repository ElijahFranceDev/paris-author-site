// Shared storefront cart. The server validates all item IDs, prices, and availability.
const PMF_CART_KEY = "cart";
const PMF_FALLBACK_PRODUCTS = {
  "quiet-days": { name: "The Quiet Days — paperback (unsigned)", cents: 2800, freeUSShipping: true },
  "if-love": { name: "If Love Could Talk", cents: 1599, freeUSShipping: false },
  "summer-kings": { name: "Summer Kings", cents: 2599, freeUSShipping: false },
  "smile-box": { name: "Smile For Me — Founding Reader Mystery Box", cents: 2199, freeUSShipping: true, preorder: true, available: false }
};
let PMF_PRODUCTS = { ...PMF_FALLBACK_PRODUCTS };
const money = (cents) => (cents / 100).toLocaleString("en-US", { style:"currency", currency:"USD" });
const getCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(PMF_CART_KEY) || "[]");
    return Array.isArray(cart) ? cart.filter(item => typeof item.bookId === "string" && PMF_PRODUCTS[item.bookId] && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch (_) { return []; }
};
function saveCart(cart) { localStorage.setItem(PMF_CART_KEY, JSON.stringify(cart)); updateCartCount(); loadCart(); }
function addToCart(bookId, title, price) {
  const product = PMF_PRODUCTS[bookId];
  if (!product) { alert("This title isn't available for direct checkout yet."); return; }
  if (product.available === false) { alert("Preorders have not opened yet. Join the reader list for updates."); return; }
  const cart = getCart(), existing = cart.find(i => i.bookId === bookId);
  if (existing) { if (existing.quantity < 10) existing.quantity += 1; }
  else cart.push({ bookId, quantity:1 });
  saveCart(cart);
  showCartToast(product.name);
}
function showCartToast(title) {
  const toast = document.getElementById("cart-toast");
  const toastText = document.getElementById("cart-toast-text");
  if (!toast || !toastText) return;
  toastText.textContent = title + " added to your cart.";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2500);
}
function updateCartCount() {
  const element = document.getElementById("cart-count");
  if (element) element.textContent = String(getCart().reduce((n, i) => n + i.quantity, 0));
}
function changeQuantity(bookId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.bookId === bookId);
  if (!item) return;
  item.quantity = Math.max(0, Math.min(10, item.quantity + delta));
  saveCart(cart.filter(i => i.quantity));
}
function removeFromCart(bookId) { saveCart(getCart().filter(i => i.bookId !== bookId)); }
function cartElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}
function loadCart() {
  const root = document.getElementById("cart-items"), totalBox = document.getElementById("cart-total");
  if (!root || !totalBox) return;
  const cart = getCart(); root.replaceChildren();
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  const total = cart.reduce((n, i) => n + PMF_PRODUCTS[i.bookId].cents * i.quantity, 0);
  totalBox.textContent = money(total);
  const countBox = document.getElementById("cart-item-count");
  if (countBox) countBox.textContent = count + " item" + (count === 1 ? "" : "s");
  const checkout = document.getElementById("cart-checkout");
  if (checkout) checkout.disabled = !cart.length;
  const shipping = document.getElementById("cart-shipping");
  if (shipping) shipping.textContent = !cart.length ? "—" : cart.every(i => PMF_PRODUCTS[i.bookId].freeUSShipping) ? "FREE (U.S.)" : "Confirmed at secure checkout";
  const note = document.getElementById("cart-preorder-note");
  if (note) note.hidden = !cart.some(i => PMF_PRODUCTS[i.bookId].preorder);
  if (!cart.length) {
    const empty = cartElement("div", "store-empty");
    empty.append(cartElement("h2", "", "Your cart is empty"), cartElement("p", "", "Find your next story in the bookstore."));
    const browse = cartElement("a", "btn secondary", "Browse books"); browse.href = "books.html"; empty.append(browse);root.append(empty);return;
  }
  cart.forEach(item => {
    const p = PMF_PRODUCTS[item.bookId], row = cartElement("article", "store-cart-item");
    const details = cartElement("div", "store-item-text");
    details.append(cartElement("h3", "", p.name), cartElement("p", "store-note", p.preorder ? "PREORDER • Free U.S. shipping" : (p.freeUSShipping ? "Free U.S. shipping" : "Shipping shown at checkout")));
    const actions = cartElement("div", "store-cart-actions");
    const minus = cartElement("button", "store-qty", "−"), countEl = cartElement("span", "store-quantity", String(item.quantity)), plus = cartElement("button", "store-qty", "+");
    minus.type = plus.type = "button";
    minus.setAttribute("aria-label", "Decrease " + p.name);plus.setAttribute("aria-label", "Increase " + p.name);
    minus.addEventListener("click", () => changeQuantity(item.bookId, -1));
    plus.addEventListener("click", () => changeQuantity(item.bookId, 1));
    const remove = cartElement("button", "store-remove", "Remove");remove.type = "button";remove.addEventListener("click", () => removeFromCart(item.bookId));
    actions.append(minus, countEl, plus, remove);details.append(actions);
    row.append(details, cartElement("strong", "store-price", money(p.cents * item.quantity)));root.append(row);
  });
}
function checkoutCart() {
  if (!getCart().length) return;
  window.location.assign("checkout.html");
}
async function loadStoreSettings() {
  try {
    const response = await fetch("/.netlify/functions/store-settings");
    if (!response.ok) return;
    const data = await response.json();
    if (!data.products) return;
    for (const [id, p] of Object.entries(data.products)) {
      if (PMF_PRODUCTS[id]) PMF_PRODUCTS[id] = { ...PMF_PRODUCTS[id], name:p.name, cents:p.cents, freeUSShipping:p.freeUSShipping, preorder:p.type === "preorder", available:p.available };
    }
    const button = document.getElementById("smile-box-buy"), waitlist = document.getElementById("smile-box-waitlist");
    if (button) button.hidden = !PMF_PRODUCTS["smile-box"].available;
    if (waitlist) waitlist.hidden = !!PMF_PRODUCTS["smile-box"].available;
  } catch (_) { /* Server availability will still be checked during checkout */ }
  loadCart();updateCartCount();
}
document.addEventListener("DOMContentLoaded", () => {
  loadCart();updateCartCount();loadStoreSettings();
  if (new URLSearchParams(location.search).get("checkout") === "cancelled") {
    const notice = document.getElementById("cart-error");
    if (notice) notice.textContent = "Checkout was cancelled. Your items are still in your cart.";
  }
});

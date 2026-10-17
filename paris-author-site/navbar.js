document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("pmf-theme-v2");

  const navPlaceholder = document.getElementById("navbar-placeholder");
  if (!navPlaceholder) return;

  navPlaceholder.innerHTML = `
    <nav class="navbar">
      <a href="index.html" class="logo">P.M. <span>France</span></a>

      <div class="menu-wrap">
        <button
          class="menu-button"
          type="button"
          aria-label="Open site menu"
          aria-expanded="false"
          aria-controls="site-dropdown"
        >Menu</button>
        <div class="dropdown" id="site-dropdown">
          <a href="index.html">Home</a>
          <a href="pm-france.html">About P.M. France</a>
          <a href="books.html">Books</a>
          <a href="store.html">Author Store</a>
          <a href="cart.html" id="pmf-cart-nav" style="display:none">Shopping Cart (<span data-pmf-cart-count>0</span>)</a>
          <a href="smile-for-me.html">Smile For Me</a>
          <a href="quiet-days.html">The Quiet Days</a>
          <a href="events.html">Events & Signings</a>
          <a href="preorder.html">Preorders</a>
          <a href="newsletter.html">Reader List</a>
          <a href="short-stories.html">Short Stories</a>
          <a href="special-editions.html">Special Editions</a>

          <a href="login.html" id="login-link">Login</a>
          <a href="signup.html" id="signup-link">Sign Up</a>
          <a href="admin.html" id="author-admin-link" aria-label="Author Admin Portal sign in">Author Admin Portal</a>
          <a href="members.html" id="account-link" style="display:none;">Account</a>
          <a href="#" id="logout-link" style="display:none;">Logout</a>
        </div>
      </div>
    </nav>
  `;

  const menuWrap = navPlaceholder.querySelector(".menu-wrap");
  if(window.PMF_CART)navPlaceholder.querySelectorAll("[data-pmf-cart-count]").forEach(el=>el.textContent=String(window.PMF_CART.count()));
  const cartNav=navPlaceholder.querySelector("#pmf-cart-nav");
  const showCart=(enabled)=>{if(cartNav)cartNav.style.display=enabled?"block":"none";};
  document.addEventListener("pmf-cart-mode",e=>showCart(e.detail?.enabled===true));
  fetch("/.netlify/functions/pmf-store-products",{cache:"no-store"}).then(r=>r.ok?r.json():{}).then(d=>showCart(d.cartEnabled===true)).catch(()=>showCart(false));
  const menuButton = navPlaceholder.querySelector(".menu-button");
  const dropdown = navPlaceholder.querySelector(".dropdown");
  let clickLockedOpen = false;

  const setClickLockedState = (open) => {
    clickLockedOpen = open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close site menu" : "Open site menu");

    if (open) {
      dropdown.style.display = "grid";
      dropdown.style.gap = "5px";
    } else {
      dropdown.style.display = "";
      dropdown.style.gap = "";
    }
  };

  menuButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setClickLockedState(!clickLockedOpen);
  });

  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (clickLockedOpen && !menuWrap.contains(event.target)) {
      setClickLockedState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && clickLockedOpen) {
      setClickLockedState(false);
      menuButton.focus();
    }
  });


  if (window.supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
      const loggedIn = !!data.session;
      const login = document.getElementById("login-link");
      const signup = document.getElementById("signup-link");
      const account = document.getElementById("account-link");
      const logout = document.getElementById("logout-link");

      if (login) login.style.display = loggedIn ? "none" : "block";
      if (signup) signup.style.display = loggedIn ? "none" : "block";
      if (account) account.style.display = loggedIn ? "block" : "none";
      if (logout) logout.style.display = loggedIn ? "block" : "none";
    });

    const logout = document.getElementById("logout-link");
    if (logout) {
      logout.addEventListener("click", async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
      });
    }
  }
});

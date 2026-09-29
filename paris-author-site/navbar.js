document.addEventListener("DOMContentLoaded", () => {
  const navPlaceholder = document.getElementById("navbar-placeholder");
  if (!navPlaceholder) return;

  navPlaceholder.innerHTML = `
    <nav class="navbar">
      <a href="index.html" class="logo">P.M. <span>France</span></a>

      <div class="menu-wrap">
        <button class="menu-button" aria-label="Open site menu">Menu</button>
        <div class="dropdown">
          <a href="index.html">Home</a>
          <a href="books.html">Books</a>
          <a href="index.html#calm-universe">The Calm Universe</a>
          <a href="preorder.html">Preorders</a>
          <a href="newsletter.html">Newsletter</a>
          <a href="short-stories.html">Short Stories</a>
          <a href="special-editions.html">Special Editions</a>
          <a href="cart.html">Cart (<span id="cart-count">0</span>)</a>
          <a href="login.html" id="login-link">Login</a>
          <a href="signup.html" id="signup-link">Sign Up</a>
          <a href="members.html" id="account-link" style="display:none;">Account</a>
          <a href="#" id="logout-link" style="display:none;">Logout</a>
        </div>
      </div>
    </nav>
  `;

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

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

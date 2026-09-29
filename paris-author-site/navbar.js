document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("pmf-theme-v2");

  document.title = document.title.replace(/Paris M\. France/g, "P.M. France");

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (node.nodeValue && node.nodeValue.includes("Paris M. France")) {
      node.nodeValue = node.nodeValue.replace(/Paris M\. France/g, "P.M. France");
    }
  });

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
          <a href="books.html">Books</a>
          <a href="smile-for-me.html">Smile For Me</a>
          <a href="events.html">Events & Signings</a>
          <a href="index.html#about">About P.M. France</a>
          <a href="preorder.html">Preorders</a>
          <a href="newsletter.html">Reader List</a>
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

  const menuWrap = navPlaceholder.querySelector(".menu-wrap");
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

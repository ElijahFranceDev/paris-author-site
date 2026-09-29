const SITE_PRICES = {
  books: {
    quietDays: {
      id: "quiet-days",
      title: "The Quiet Days",
      price: 28.00
    },
    ifLove: {
      id: "if-love",
      title: "If Love Could Talk",
      price: 15.99
    },
    summerKings: {
      id: "summer-kings",
      title: "Summer Kings",
      price: 25.99
    }
  },

  subscriptions: {
    house: {
      name: "House of France",
      priceText: "$13.00/mo"
    },
    mList: {
      name: "The M vault",
      priceText: "$22.00/mo"
    }
  }
};

function formatPrice(price) {
  return "$" + price.toFixed(2);
}

function loadSitePrices() {
  document.querySelectorAll("[data-price]").forEach(el => {
    const key = el.dataset.price;

    if (key === "quiet-days") {
      el.textContent = formatPrice(SITE_PRICES.books.quietDays.price);
    }

    if (key === "if-love") {
      el.textContent = formatPrice(SITE_PRICES.books.ifLove.price);
    }

    if (key === "summer-kings") {
      el.textContent = formatPrice(SITE_PRICES.books.summerKings.price);
    }

    if (key === "house") {
      el.textContent = SITE_PRICES.subscriptions.house.priceText;
    }

    if (key === "m-list") {
      el.textContent = SITE_PRICES.subscriptions.mList.priceText;
    }
  });
}

document.addEventListener("DOMContentLoaded", loadSitePrices);
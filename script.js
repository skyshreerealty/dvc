/* ===== SkyShree Realty — Digital Visiting Card ===== */

/* Google Apps Script Web App URL (the .../exec link) — used for both
   inquiries and feedback. The script routes by the payload's "form" field. */
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwrBmv4BmDFiL8-0orQJR-9azKeXqJN-ENxWOQgGVVim6JzB3vwCFuhXp1MWL_jkb1HLA/exec";

/* ---------- 1. Animated view counter ---------- */
(function () {
  // persist a view count in localStorage so it grows each visit (starts at 0)
  let views = parseInt(localStorage.getItem("skyshreeViews_v1") || "0", 10) + 1;
  localStorage.setItem("skyshreeViews_v1", views);

  const el = document.getElementById("viewCount");
  let n = Math.max(0, views - 120);
  const step = () => {
    n += Math.ceil((views - n) / 12);
    if (n >= views) n = views;
    el.textContent = n.toLocaleString();
    if (n < views) requestAnimationFrame(step);
  };
  step();
})();

/* ---------- 2. Brochures ----------
   PDFs live in the /brochures folder. To add a new one:
   1) Drop the PDF file into the brochures/ folder.
   2) Add an entry to brochures/brochures.json  ->  { "title": "...", "file": "yourfile.pdf" }
   The list below is built automatically from that manifest, and works on GitHub Pages. */
const brochureList = document.getElementById("brochureList");
const BROCHURES_PER_PAGE = 5;
let allBrochures = [];
let brochurePage = 1;
let brochureFilter = "all"; // "all" | Commercial | Residential

// Brochures matching the active filter.
function filteredBrochures() {
  if (brochureFilter === "all") return allBrochures;
  return allBrochures.filter((b) => b.category === brochureFilter);
}

// Pagination controls, inserted right after the list.
const brochurePagination = document.createElement("div");
brochurePagination.className = "pagination";
brochureList.insertAdjacentElement("afterend", brochurePagination);

function renderBrochures() {
  brochureList.innerHTML = "";
  const list = filteredBrochures();
  if (!list.length) {
    const msg = allBrochures.length ? "No brochures match this filter." : "No brochures available yet.";
    brochureList.innerHTML = `<p style="font-size:14px;color:#6b7280">${msg}</p>`;
    brochurePagination.innerHTML = "";
    return;
  }

  const start = (brochurePage - 1) * BROCHURES_PER_PAGE;
  list.slice(start, start + BROCHURES_PER_PAGE).forEach(({ title, file }) => {
    const url = "brochures/" + file;
    const row = document.createElement("div");
    row.className = "brochure-item";
    row.innerHTML = `
      <i class="fa-solid fa-file-pdf"></i>
      <span class="name">${title}</span>
      <a href="${url}" download title="Download ${title}">
        <i class="fa-solid fa-circle-down"></i>
      </a>`;
    brochureList.appendChild(row);
  });

  renderBrochurePagination();
}

function renderBrochurePagination() {
  const pageCount = Math.ceil(filteredBrochures().length / BROCHURES_PER_PAGE);
  brochurePagination.innerHTML = "";
  if (pageCount <= 1) return;

  const makeBtn = (label, page, opts = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "page-btn" + (opts.active ? " active" : "");
    b.innerHTML = label;
    b.disabled = !!opts.disabled;
    if (!opts.disabled && !opts.active) {
      b.addEventListener("click", () => {
        brochurePage = page;
        renderBrochures();
        document.getElementById("brochureList").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    return b;
  };

  brochurePagination.appendChild(
    makeBtn('<i class="fa-solid fa-angle-left"></i>', brochurePage - 1, { disabled: brochurePage === 1 })
  );
  for (let p = 1; p <= pageCount; p++) {
    brochurePagination.appendChild(makeBtn(String(p), p, { active: p === brochurePage }));
  }
  brochurePagination.appendChild(
    makeBtn('<i class="fa-solid fa-angle-right"></i>', brochurePage + 1, { disabled: brochurePage === pageCount })
  );
}

fetch("brochures/brochures.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((items) => {
    allBrochures = Array.isArray(items) ? items : [];
    brochurePage = 1;
    renderBrochures();
  })
  .catch(() => {
    brochureList.innerHTML =
      `<p style="font-size:14px;color:#6b7280">Could not load brochures. ` +
      `Make sure brochures/brochures.json exists.</p>`;
  });

// Filter buttons: pick a filter, reset to page 1, re-render.
document.querySelectorAll("#brochureFilters .filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#brochureFilters .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    brochureFilter = btn.dataset.filter;
    brochurePage = 1;
    renderBrochures();
  });
});

/* ---------- 3. Gallery ----------
   Property photos live in the /gallery folder. To add a new one:
   1) Drop the image file (jpg/png/webp) into the gallery/ folder.
   2) Add an entry to gallery/gallery.json  ->  { "title": "...", "file": "yourphoto.jpg" }
   The grid is built automatically from that manifest. Tapping a photo opens
   a full-screen lightbox so visitors can view it large. */
const galleryGrid = document.getElementById("galleryGrid");

// --- Lightbox: built once, reused for every photo ---
const lightbox = document.createElement("div");
lightbox.className = "lightbox";
lightbox.innerHTML = `
  <span class="lightbox-close" aria-label="Close">&times;</span>
  <img class="lightbox-img" alt="" />
  <p class="lightbox-caption"></p>`;
document.body.appendChild(lightbox);
const lightboxImg = lightbox.querySelector(".lightbox-img");
const lightboxCaption = lightbox.querySelector(".lightbox-caption");

function openLightbox(src, title) {
  lightboxImg.src = src;
  lightboxImg.alt = title || "";
  lightboxCaption.textContent = title || "";
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden"; // stop background scroll
}
function closeLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
  lightboxImg.src = "";
}
lightbox.addEventListener("click", (e) => {
  // close when clicking the backdrop or the × (but not the image itself)
  if (e.target === lightbox || e.target.classList.contains("lightbox-close")) {
    closeLightbox();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

function renderGallery(items) {
  galleryGrid.innerHTML = "";
  if (!items.length) {
    galleryGrid.innerHTML = `<p style="font-size:14px;color:#6b7280">No photos available yet.</p>`;
    return;
  }
  items.forEach(({ title, file }) => {
    const url = "gallery/" + file;
    const img = document.createElement("img");
    img.src = url;
    img.alt = title || "Property photo";
    img.title = title || "";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(url, title));
    galleryGrid.appendChild(img);
  });
}

fetch("gallery/gallery.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then(renderGallery)
  .catch(() => {
    galleryGrid.innerHTML =
      `<p style="font-size:14px;color:#6b7280">Could not load photos. ` +
      `Make sure gallery/gallery.json exists.</p>`;
  });

/* ---------- 3b. Featured properties ----------
   Listings live in properties/properties.json. To add one:
   1) Drop the photo into the properties/ folder.
   2) Add an entry:
      { "title": "...", "location": "...", "price": "...", "photo": "file.jpg" }
   Tapping the photo opens it in the same lightbox; "Enquire" jumps to the form. */
const propertyList = document.getElementById("propertyList");
const PROPERTIES_PER_PAGE = 5;
let allProperties = [];
let propertyPage = 1;
let propertyFilter = "all"; // "all" | Buy | Sell | Rent | Residential | Commercial | Land

// Pagination controls, inserted right after the list.
const propertyPagination = document.createElement("div");
propertyPagination.className = "pagination";
propertyList.insertAdjacentElement("afterend", propertyPagination);

// Properties matching the active filter (matches either type or category).
function filteredProperties() {
  if (propertyFilter === "all") return allProperties;
  return allProperties.filter(
    (p) => p.type === propertyFilter || p.category === propertyFilter
  );
}

function renderProperties() {
  propertyList.innerHTML = "";
  const items = filteredProperties();
  if (!items.length) {
    const msg = allProperties.length ? "No properties match this filter." : "No properties listed yet.";
    propertyList.innerHTML = `<p style="font-size:14px;color:#6b7280">${msg}</p>`;
    propertyPagination.innerHTML = "";
    return;
  }

  const start = (propertyPage - 1) * PROPERTIES_PER_PAGE;
  items.slice(start, start + PROPERTIES_PER_PAGE).forEach(({ title, location, size, price, photo, type, category }) => {
    const url = photo ? "properties/" + photo : "";
    const card = document.createElement("div");
    card.className = "property-card";
    card.innerHTML = `
      ${url ? `<img class="property-photo" src="${url}" alt="${title || "Property"}" loading="lazy" />` : ""}
      <div class="property-info">
        <h3 class="property-title">${title || ""}</h3>
        ${location ? `<p class="property-loc"><i class="fa-solid fa-location-dot"></i> ${location}</p>` : ""}
        ${size ? `<p class="property-size"><i class="fa-solid fa-ruler-combined"></i> ${size}</p>` : ""}
        ${price ? `<p class="property-price">${price}</p>` : ""}
        <a href="#enquiry-section" class="property-enquire">Enquire</a>
      </div>`;
    if (url) {
      card.querySelector(".property-photo").addEventListener("click", () => openLightbox(url, title));
    }

    // Enquire: prefill the inquiry form (message + Type/Category), then let
    // the link scroll down to the form so the visitor adds the rest.
    card.querySelector(".property-enquire").addEventListener("click", () => {
      const msg = document.getElementById("inqMessage");
      if (msg) {
        const parts = [title, location].filter(Boolean).join(", ");
        msg.value = `I am interested in this property: ${parts}. Please share more details.`;
      }

      // Auto-select Type (defaults to "Buy"), which builds the Category radios.
      const typeVal = type || "Buy";
      const typeRadio = document.querySelector(`input[name="inqType"][value="${typeVal}"]`);
      if (typeRadio) {
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event("change")); // rebuilds + reveals categories
        if (category) {
          const catRadio = document.querySelector(`input[name="inqCategory"][value="${category}"]`);
          if (catRadio) catRadio.checked = true;
        }
      }
    });

    propertyList.appendChild(card);
  });

  renderPropertyPagination();
}

function renderPropertyPagination() {
  const pageCount = Math.ceil(filteredProperties().length / PROPERTIES_PER_PAGE);
  propertyPagination.innerHTML = "";
  if (pageCount <= 1) return;

  const makeBtn = (label, page, opts = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "page-btn" + (opts.active ? " active" : "");
    b.innerHTML = label;
    b.disabled = !!opts.disabled;
    if (!opts.disabled && !opts.active) {
      b.addEventListener("click", () => {
        propertyPage = page;
        renderProperties();
        document.getElementById("propertyList").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    return b;
  };

  propertyPagination.appendChild(
    makeBtn('<i class="fa-solid fa-angle-left"></i>', propertyPage - 1, { disabled: propertyPage === 1 })
  );
  for (let p = 1; p <= pageCount; p++) {
    propertyPagination.appendChild(makeBtn(String(p), p, { active: p === propertyPage }));
  }
  propertyPagination.appendChild(
    makeBtn('<i class="fa-solid fa-angle-right"></i>', propertyPage + 1, { disabled: propertyPage === pageCount })
  );
}

// Filter buttons: pick a filter, reset to page 1, re-render.
document.querySelectorAll("#propertyFilters .filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#propertyFilters .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    propertyFilter = btn.dataset.filter;
    propertyPage = 1;
    renderProperties();
  });
});

fetch("properties/properties.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((items) => {
    allProperties = Array.isArray(items) ? items : [];
    propertyPage = 1;
    renderProperties();
  })
  .catch(() => {
    propertyList.innerHTML =
      `<p style="font-size:14px;color:#6b7280">Could not load properties. ` +
      `Make sure properties/properties.json exists.</p>`;
  });

/* ---------- 3c. Save Contact (vCard) per person ---------- */
// Build a .vcf for one person, tagged with the company so it saves under
// their own name on the visitor's phone.
function buildVCard({ name, role, phone }) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:" + name + ";;;;",
    "FN:" + name,
    "ORG:SkyShree Realty",
    "TITLE:" + (role || ""),
    "TEL;TYPE=CELL:" + phone,
    "EMAIL:skyshreerealty@gmail.com",
    "ADR;TYPE=WORK:;;B-405 Time Square 2, Near Avlon Hotel, Thaltej;Ahmedabad;Gujarat;380054;India",
    "URL:https://skyshreerealty.github.io/dvc/",
    "END:VCARD",
  ].join("\r\n");
}

function downloadVCard(person) {
  const blob = new Blob([buildVCard(person)], { type: "text/vcard;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = person.name.replace(/\s+/g, "-") + ".vcf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Wire up every per-person "Save Contact" button using its row's data-* values.
document.querySelectorAll(".person .save-contact-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const row = btn.closest(".person");
    downloadVCard({
      name: row.dataset.name,
      role: row.dataset.role,
      phone: row.dataset.phone,
    });
  });
});

/* ---------- 4. Feedbacks ---------- */
// Built-in sample testimonials shown by default. Feedback submitted by
// visitors is stored in the Google Sheet and loaded on top of these.
const seedFeedbacks = [
  
];
let feedbacks = [...seedFeedbacks];

const feedbackList = document.getElementById("feedbackList");
const FEEDBACKS_PER_PAGE = 5;
let feedbackPage = 1;

// Pagination controls, inserted right after the list.
const feedbackPagination = document.createElement("div");
feedbackPagination.className = "pagination";
feedbackList.insertAdjacentElement("afterend", feedbackPagination);

function starHtml(r) {
  return "★".repeat(r) + "☆".repeat(5 - r);
}
function renderFeedbacks() {
  feedbackList.innerHTML = "";
  if (!feedbacks.length) {
    feedbackList.innerHTML = `<p style="font-size:14px;color:#6b7280">No feedback yet. Be the first to share!</p>`;
    feedbackPagination.innerHTML = "";
    return;
  }

  const start = (feedbackPage - 1) * FEEDBACKS_PER_PAGE;
  feedbacks.slice(start, start + FEEDBACKS_PER_PAGE).forEach((f) => {
    const item = document.createElement("div");
    item.className = "feedback-item";
    item.innerHTML = `
      <div class="feedback-head">
        <span class="fname">${f.name}</span>
        <span class="fdate">on ${f.date}</span>
      </div>
      <div class="feedback-stars">${starHtml(f.rating)}</div>
      <p class="ftext">${f.text}</p>`;
    feedbackList.appendChild(item);
  });

  renderFeedbackPagination();
}

function renderFeedbackPagination() {
  const pageCount = Math.ceil(feedbacks.length / FEEDBACKS_PER_PAGE);
  feedbackPagination.innerHTML = "";
  if (pageCount <= 1) return;

  const makeBtn = (label, page, opts = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "page-btn" + (opts.active ? " active" : "");
    b.innerHTML = label;
    b.disabled = !!opts.disabled;
    if (!opts.disabled && !opts.active) {
      b.addEventListener("click", () => {
        feedbackPage = page;
        renderFeedbacks();
        feedbackList.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    return b;
  };

  feedbackPagination.appendChild(
    makeBtn('<i class="fa-solid fa-angle-left"></i>', feedbackPage - 1, { disabled: feedbackPage === 1 })
  );
  for (let p = 1; p <= pageCount; p++) {
    feedbackPagination.appendChild(makeBtn(String(p), p, { active: p === feedbackPage }));
  }
  feedbackPagination.appendChild(
    makeBtn('<i class="fa-solid fa-angle-right"></i>', feedbackPage + 1, { disabled: feedbackPage === pageCount })
  );
}

function showFeedbackLoader() {
  feedbackList.innerHTML = `
    <div class="feedback-loader">
      <span class="spinner"></span>
      <span>Loading feedback…</span>
    </div>`;
  feedbackPagination.innerHTML = "";
}

// Load feedback saved by other visitors from the sheet, newest first,
// and show it above the built-in samples.
function loadFeedbacks() {
  showFeedbackLoader();
  fetch(SHEET_API_URL + "?form=feedback", { cache: "no-store" })
    .then((r) => r.json())
    .then((rows) => {
      if (Array.isArray(rows)) feedbacks = [...rows, ...seedFeedbacks];
      renderFeedbacks();
    })
    .catch(() => {
      // Show the seed testimonials if the load fails.
      renderFeedbacks();
    });
}
loadFeedbacks();

/* ---------- 5. Star rating picker ---------- */
let selectedRating = 0;
const stars = document.querySelectorAll("#ratingStars i");
function paintStars(v) {
  stars.forEach((s) => {
    const on = Number(s.dataset.v) <= v;
    s.className = on ? "fa-solid fa-star" : "fa-regular fa-star";
  });
}
stars.forEach((s) => {
  s.addEventListener("mouseenter", () => paintStars(Number(s.dataset.v)));
  s.addEventListener("click", () => {
    selectedRating = Number(s.dataset.v);
    paintStars(selectedRating);
  });
});
document.getElementById("ratingStars").addEventListener("mouseleave", () => paintStars(selectedRating));

/* ---------- 6. Feedback form ---------- */
document.getElementById("feedbackForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("fbName").value.trim();
  const text = document.getElementById("fbText").value.trim();
  if (!selectedRating) return alert("Please select a rating.");

  const entry = {
    name,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    rating: selectedRating,
    text,
  };

  // Save to the Google Sheet so every visitor sees it. Tag with form:"feedback"
  // so the Apps Script routes it to the Feedback tab.
  fetch(SHEET_API_URL, {
    method: "POST",
    body: JSON.stringify({ form: "feedback", ...entry }),
  }).catch(() => {
    /* even if the save fails, still show it locally below */
  });

  // Show it immediately for this visitor (it will also load for others on refresh).
  feedbacks.unshift(entry);
  feedbackPage = 1; // jump to first page so the new feedback is visible
  renderFeedbacks();
  e.target.reset();
  selectedRating = 0;
  paintStars(0);
  alert("Thank you for your feedback!");
});

/* ---------- 7. Share on WhatsApp ---------- */
document.getElementById("shareForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const num = document.getElementById("shareNumber").value.trim();
  if (!/^\d{10}$/.test(num)) return alert("Please enter a valid 10-digit mobile number.");
  const msg = encodeURIComponent("Check out SkyShree Realty digital card: " + window.location.href);
  window.open(`https://wa.me/91${num}?text=${msg}`, "_blank");
});

/* ---------- 8. Inquiry form ---------- */
// Category options that depend on the selected Type.
const inquiryCategories = {
  Buy: ["Commercial", "Residential", "Land"],
  Sell: ["Commercial", "Residential", "Land"],
  Rent: ["Commercial", "Residential"],
};

const categoryRow = document.getElementById("inqCategoryRow");
const categoryOptions = document.getElementById("inqCategoryOptions");

// When a Type is chosen, rebuild the Category radios and reveal the row.
document.querySelectorAll('input[name="inqType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const options = inquiryCategories[radio.value] || [];
    categoryOptions.innerHTML = options
      .map(
        (c) =>
          `<label><input type="radio" name="inqCategory" value="${c}" required /> ${c}</label>`
      )
      .join("");
    categoryRow.hidden = false;
  });
});

document.getElementById("inquiryForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const typeEl = document.querySelector('input[name="inqType"]:checked');
  const categoryEl = document.querySelector('input[name="inqCategory"]:checked');
  const payload = {
    form: "inquiry",
    name: document.getElementById("inqName").value.trim(),
    phone: document.getElementById("inqPhone").value.trim(),
    email: document.getElementById("inqEmail").value.trim(),
    type: typeEl ? typeEl.value : "",
    category: categoryEl ? categoryEl.value : "",
    message: document.getElementById("inqMessage").value.trim(),
  };

  const btn = document.getElementById("inqSubmitBtn");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Sending…";

  fetch(SHEET_API_URL, {
    method: "POST",
    // Apps Script web apps don't return CORS headers, so we send as a simple
    // request. The row is still saved; we just can't read the response body.
    body: JSON.stringify(payload),
  })
    .then(() => {
      alert("Thank you! Your inquiry has been submitted. We will contact you soon.");
      e.target.reset();
      categoryOptions.innerHTML = "";
      categoryRow.hidden = true;
    })
    .catch(() => {
      alert("Sorry, something went wrong. Please try again later.");
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = originalText;
    });
});

/* ---------- 9. Bottom-nav active state on scroll ---------- */
const navItems = document.querySelectorAll(".nav-item");
const navMap = {};
navItems.forEach((a) => (navMap[a.getAttribute("href").slice(1)] = a));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting && navMap[en.target.id]) {
        navItems.forEach((n) => n.classList.remove("active"));
        navMap[en.target.id].classList.add("active");
      }
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);
["home-section", "about-us-section", "products-services-section", "properties-section", "gallery-section", "feedback-section", "enquiry-section"]
  .forEach((id) => {
    const sec = document.getElementById(id);
    if (sec) observer.observe(sec);
  });

/* ---------- 10. PWA service worker (Add to Home Screen) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* registration fails silently on unsupported / file:// contexts */
    });
  });
}

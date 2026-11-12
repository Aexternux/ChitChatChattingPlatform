/* Injects a shared Instagram-style sidebar on authenticated app pages,
   wrapping the existing page content into a flex shell.
   Requires firebase-config.js (window.db) and, ideally, profile-utils.js. */
(function () {
  var APP_PAGES = ["dashboard.html", "chat.html", "profile.html", "add-friends.html", "settings.html"];
  var page = (location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
  if (APP_PAGES.indexOf(page) === -1) return;

  var me = null;
  try { me = localStorage.getItem("username"); } catch (e) {}
  if (!me) return; // not logged in → leave page as-is (it will redirect itself)

  var myName = null;
  try { myName = localStorage.getItem("name"); } catch (e) {}

  // Feather-style line icons
  var I = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    add: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  };
  function svg(p) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">' + p + '</svg>';
  }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(m){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]);}); }

  var profileHref = "profile.html?user=" + encodeURIComponent(me);
  var items = [
    { key: "dashboard", label: "Home",        href: "dashboard.html",  icon: I.home,   active: page === "dashboard.html" || page === "chat.html" },
    { key: "add",       label: "Add Friends", href: "add-friends.html", icon: I.add,    active: page === "add-friends.html" },
    { key: "profile",   label: "Profile",     href: profileHref,        icon: I.user,   active: page === "profile.html" },
    { key: "settings",  label: "Settings",    href: "settings.html",    icon: I.gear,   active: page === "settings.html" }
  ];

  function build() {
    // Move existing page content into <main>
    var main = document.createElement("main");
    main.className = "app-main";
    while (document.body.firstChild) {
      var n = document.body.firstChild;
      // leave the floating theme toggle at body level if present
      if (n.id === "cc-theme-toggle") { break; }
      main.appendChild(n);
    }

    var aside = document.createElement("aside");
    aside.className = "cc-sidebar";
    aside.innerHTML =
      '<a class="cc-logo" href="dashboard.html">' + svg(I.chat) + '<span>ChitChat</span></a>' +
      '<nav class="cc-nav">' +
        items.map(function (it) {
          return '<a href="' + esc(it.href) + '" data-k="' + it.key + '" class="' + (it.active ? "active" : "") + '">' +
                 svg(it.icon) + '<span>' + esc(it.label) + '</span></a>';
        }).join("") +
      '</nav>' +
      '<div class="cc-side-foot">' +
        '<a class="cc-me" href="' + esc(profileHref) + '">' +
          '<span class="cc-me-ava"></span>' +
          '<span class="cc-me-name">' + esc(myName || me) + '<small>@' + esc(me) + '</small></span>' +
        '</a>' +
        '<button class="cc-logout" type="button">' + svg(I.logout) + '<span>Log out</span></button>' +
      '</div>';

    var shell = document.createElement("div");
    shell.className = "app-shell";
    shell.appendChild(aside);
    shell.appendChild(main);
    document.body.insertBefore(shell, document.body.firstChild);

    // avatar
    var avaSlot = aside.querySelector(".cc-me-ava");
    if (window.makeAvatar) {
      avaSlot.replaceWith(window.makeAvatar(me, myName || me, 38));
    } else {
      avaSlot.className = "cc-avatar";
      avaSlot.style.cssText = "width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;";
      avaSlot.textContent = (myName || me).charAt(0).toUpperCase();
    }

    aside.querySelector(".cc-logout").addEventListener("click", function () {
      try { localStorage.removeItem("username"); localStorage.removeItem("chatWith"); localStorage.removeItem("name"); } catch (e) {}
      location.href = "index.html";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

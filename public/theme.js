/* Dark-mode theming: persists choice, respects system preference,
   and injects a floating toggle on every page. Load in <head>. */
(function () {
  var KEY = "cc-theme";

  function sysPref() {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
    catch (e) { return "light"; }
  }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (document.body) document.body.classList.toggle("dark", theme === "dark"); // legacy friends.css support
  }

  // Apply ASAP (before first paint) to avoid a flash of the wrong theme.
  apply(saved() || sysPref());

  var btn;
  function updateBtn() {
    if (!btn) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.textContent = dark ? "☀️" : "🌙";
    btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
  }
  function flip() {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
    updateBtn();
  }

  function inject() {
    apply(saved() || sysPref()); // ensure body.dark now that body exists
    btn = document.createElement("button");
    btn.id = "cc-theme-toggle";
    btn.setAttribute("aria-label", "Toggle dark mode");
    btn.addEventListener("click", flip);
    // Keep clear of the chat composer, which sits at the bottom of the screen.
    if (document.getElementById("form") && document.getElementById("messages")) {
      btn.style.bottom = "84px";
    }
    document.body.appendChild(btn);
    updateBtn();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();

  // Follow the OS theme only while the user hasn't made an explicit choice.
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (!saved()) { apply(e.matches ? "dark" : "light"); updateBtn(); }
    });
  } catch (e) {}
})();

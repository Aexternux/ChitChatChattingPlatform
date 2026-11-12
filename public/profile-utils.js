/* Shared profile helpers: clickable avatars, navigation, image compression.
   Depends on firebase-config.js (window.db) being loaded first. */
(function () {
  // --- one-time styles for avatars used across pages ---
  if (!document.getElementById("cc-avatar-styles")) {
    const s = document.createElement("style");
    s.id = "cc-avatar-styles";
    s.textContent = `
      .cc-avatar{
        border-radius:50%; background:#2196f3; color:#fff; font-weight:700;
        display:inline-flex; align-items:center; justify-content:center;
        background-size:cover; background-position:center; flex:0 0 auto;
        cursor:pointer; overflow:hidden; user-select:none; line-height:1;
      }
      .cc-avatar.has-photo{background-color:#ddd}
      .cc-clickable{cursor:pointer}
    `;
    document.head.appendChild(s);
  }

  // Navigate to someone's profile page.
  window.goToProfile = function (username) {
    if (!username) return;
    window.location.href = "profile.html?user=" + encodeURIComponent(username);
  };

  // Cache user photos so lists don't refetch repeatedly.
  const _photoCache = {};
  window.getUserPhoto = function (username) {
    if (username in _photoCache) return Promise.resolve(_photoCache[username]);
    return window.db.collection("users").doc(username).get()
      .then(doc => {
        const p = doc.exists ? (doc.data().photo || null) : null;
        _photoCache[username] = p;
        return p;
      })
      .catch(() => null);
  };

  // Build a round avatar element that lazy-loads the user's photo and links to
  // their profile on click. `size` is pixels.
  window.makeAvatar = function (username, name, size) {
    const a = document.createElement("div");
    a.className = "cc-avatar";
    const px = (size || 36);
    a.style.width = px + "px";
    a.style.height = px + "px";
    a.style.fontSize = Math.round(px * 0.42) + "px";
    a.title = "View " + (name || username) + "'s profile";
    a.textContent = ((name || username || "?").trim().charAt(0) || "?").toUpperCase();
    a.addEventListener("click", function (e) {
      e.stopPropagation();
      window.goToProfile(username);
    });
    window.getUserPhoto(username).then(p => {
      if (p) { a.style.backgroundImage = `url("${p}")`; a.textContent = ""; a.classList.add("has-photo"); }
    });
    return a;
  };

  // Compress/resize an image File to a JPEG data URL under a byte budget.
  // Firestore docs are capped at ~1MB; we aim well under that.
  window.compressImage = function (file, maxSize, quality) {
    maxSize = maxSize || 1000;
    quality = quality == null ? 0.72 : quality;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
          else { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          // Shrink quality until the data URL is comfortably under the 1MB doc limit.
          let q = quality, url = c.toDataURL("image/jpeg", q);
          const LIMIT = 900000; // ~0.9MB of base64 text
          while (url.length > LIMIT && q > 0.3) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
          resolve(url);
        };
        img.onerror = () => reject(new Error("Could not read that image."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL(file);
    });
  };
})();

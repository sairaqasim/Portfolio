/* Shared across all pages: theme toggle + reading progress.
   NOTE: each page also has a tiny inline snippet in <head> that applies the
   saved theme before first paint, so there is no flash of the wrong theme. */

(function () {
  "use strict";

  /* ---- Theme toggle ---- */
  var toggle = document.querySelector(".theme-toggle");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* private browsing, theme just won't persist */
    }
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      );
    }
  }

  if (toggle) {
    applyTheme(currentTheme()); // sync aria-label with pre-paint theme
    toggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* ---- Follow cursor ----
     Cards with data-cursor get a label pill that trails the pointer.
     Skipped on touch/coarse pointers, where there is no hover to speak of. */
  var cursorTargets = document.querySelectorAll("[data-cursor]");

  if (
    cursorTargets.length &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    var pill = document.createElement("div");
    pill.className = "cursor-pill";
    pill.setAttribute("aria-hidden", "true");
    document.body.appendChild(pill);
    document.body.classList.add("has-follow-cursor");

    var pillX = 0,
      pillY = 0,
      pillQueued = false;

    function placePill() {
      pill.style.transform =
        "translate(" + pillX + "px, " + pillY + "px) translate(-50%, -50%)" +
        (pill.classList.contains("is-visible") ? " scale(1)" : " scale(0.8)");
      pillQueued = false;
    }

    function trackPointer(e) {
      pillX = e.clientX;
      pillY = e.clientY + 28; // sit just below the pointer
      if (!pillQueued) {
        pillQueued = true;
        window.requestAnimationFrame(placePill);
      }
    }

    Array.prototype.forEach.call(cursorTargets, function (el) {
      el.addEventListener("mouseenter", function (e) {
        pill.textContent = el.getAttribute("data-cursor");
        trackPointer(e);
        pill.classList.add("is-visible");
        placePill();
      });

      el.addEventListener("mousemove", trackPointer);

      el.addEventListener("mouseleave", function () {
        pill.classList.remove("is-visible");
        placePill();
      });
    });

    // Don't leave the pill stranded if the pointer exits the window
    document.addEventListener("mouseleave", function () {
      pill.classList.remove("is-visible");
      placePill();
    });
  }

  /* ---- Video sound toggles ----
     Videos have to start muted for autoplay to be allowed, so each one gets
     a button to turn its sound on. Turning one on mutes the others, so two
     soundtracks can never overlap. */
  // Screen recordings inside device mockups are silent UI demos, they get
  // the viewport-triggered playback below instead of a sound toggle.
  var figureVideos = document.querySelectorAll("figure video:not(.is-screen)");

  /* ---- Device-mockup screens ----
     Heavy files, so they carry preload="none" and only start once scrolled
     into view; they pause again when they leave, to stop background decoding. */
  var screenVideos = document.querySelectorAll("video.is-screen");

  if (screenVideos.length) {
    var playScreen = function (video) {
      if (video.preload === "none") video.preload = "auto";
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) playScreen(e.target);
            else e.target.pause();
          });
        },
        { rootMargin: "200px 0px", threshold: 0.15 }
      );
      Array.prototype.forEach.call(screenVideos, function (v) {
        io.observe(v);
      });
    } else {
      Array.prototype.forEach.call(screenVideos, playScreen);
    }
  }

  var SPEAKER_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  var SPEAKER_ON =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  var soundVideos = [];

  Array.prototype.forEach.call(figureVideos, function (video) {
    // Wrap the video so the button can be positioned over it, not over
    // the figcaption underneath.
    var holder = document.createElement("div");
    holder.className = "video-holder";
    video.parentNode.insertBefore(holder, video);
    holder.appendChild(video);

    var btn = document.createElement("button");
    btn.className = "video-sound";
    btn.type = "button";
    holder.appendChild(btn);

    function render() {
      btn.innerHTML = video.muted ? SPEAKER_OFF : SPEAKER_ON;
      btn.setAttribute(
        "aria-label",
        video.muted ? "Turn sound on" : "Turn sound off"
      );
      btn.setAttribute("aria-pressed", video.muted ? "false" : "true");
    }

    btn.addEventListener("click", function () {
      var turningOn = video.muted;
      if (turningOn) {
        // Only one soundtrack at a time
        soundVideos.forEach(function (other) {
          if (other.video !== video && !other.video.muted) {
            other.video.muted = true;
            other.render();
          }
        });
      }
      video.muted = !video.muted;
      if (!video.muted) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
      render();
    });

    video.addEventListener("volumechange", render);

    soundVideos.push({ video: video, render: render });
    render();
  });

  /* ---- Back to top ----
     Appears once the reader is a screen or so down the page. */
  if (document.querySelector(".case")) {
    var toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.type = "button";
    toTop.setAttribute("aria-label", "Back to top");
    toTop.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" ' +
      'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(toTop);

    toTop.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      // Each frame jumps instantly, the easing below supplies the motion.
      // Without "instant" the page's own smooth scrolling fights this.
      function jumpTo(y) {
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      }

      if (reduce || !window.requestAnimationFrame) {
        jumpTo(0);
        return;
      }
      var from = window.scrollY;
      var t0 = null;
      var duration = 420;
      function step(now) {
        if (t0 === null) t0 = now;
        var p = Math.min((now - t0) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        jumpTo(Math.round(from * (1 - eased)));
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });

    var toTopQueued = false;
    function syncToTop() {
      toTop.classList.toggle("is-visible", window.scrollY > 700);
      toTopQueued = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!toTopQueued) {
          toTopQueued = true;
          window.requestAnimationFrame(syncToTop);
        }
      },
      { passive: true }
    );
    syncToTop();
  }

  /* ---- Sideways-scrolling diagrams ----
     Diagrams wider than the article column scroll horizontally. Flag the
     wrapper so CSS can show the edge fade, nudge button and hint line only
     when there is actually more to see. */
  var flowWraps = document.querySelectorAll(".flow-wrap");

  Array.prototype.forEach.call(flowWraps, function (wrap) {
    var scroller = wrap.querySelector(".flow");
    var next = wrap.querySelector(".flow-next");
    if (!scroller) return;

    var queued = false;

    function sync() {
      var max = scroller.scrollWidth - scroller.clientWidth;
      var scrollable = max > 4;
      wrap.classList.toggle("can-scroll", scrollable);
      wrap.classList.toggle(
        "can-scroll-right",
        scrollable && scroller.scrollLeft < max - 4
      );
      wrap.classList.toggle("can-scroll-left", scroller.scrollLeft > 4);
      queued = false;
    }

    scroller.addEventListener(
      "scroll",
      function () {
        if (!queued) {
          queued = true;
          window.requestAnimationFrame(sync);
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", sync);

    if (next) {
      next.addEventListener("click", function () {
        var step = Math.round(scroller.clientWidth * 0.75);
        var max = scroller.scrollWidth - scroller.clientWidth;
        var from = scroller.scrollLeft;
        var to = Math.max(0, Math.min(from + step, max));

        // Animate by hand: `behavior: "smooth"` is unsupported in some
        // engines, where it silently does nothing at all.
        if (
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          !window.requestAnimationFrame
        ) {
          scroller.scrollLeft = to;
          sync();
          return;
        }

        var t0 = null;
        var duration = 320;

        function step_(now) {
          if (t0 === null) t0 = now;
          var p = Math.min((now - t0) / duration, 1);
          var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          scroller.scrollLeft = from + (to - from) * eased;
          if (p < 1) window.requestAnimationFrame(step_);
          else sync();
        }

        window.requestAnimationFrame(step_);
      });
    }

    sync();
    // Images/fonts can change the track width after first paint
    window.addEventListener("load", sync);
  });

  /* ---- Reading progress + labeled TOC rail (case study pages only) ----
     The thin progress bar is in the page markup; the labeled rail is built
     here from the article's sections. Section labels come from data-toc,
     falling back to the kicker (text after the "·"), then the heading. */
  var progress = document.querySelector(".read-progress");
  var article = document.querySelector(".case");
  var tocLinks = [];
  var tocHeadings = [];

  if (article) {
    var sections = article.querySelectorAll("section");
    var items = [];

    Array.prototype.forEach.call(sections, function (sec) {
      var h2 = sec.querySelector("h2[id]");
      if (!h2) return;
      var label = sec.getAttribute("data-toc");
      if (!label) {
        var kicker = sec.querySelector(".kicker");
        if (kicker) {
          var parts = kicker.textContent.split("·");
          label = parts[parts.length - 1].trim();
        }
      }
      if (!label) label = h2.textContent.trim();
      items.push({ id: h2.id, label: label, heading: h2 });
    });

    if (items.length >= 2) {
      var toc = document.createElement("nav");
      toc.className = "toc";
      toc.setAttribute("aria-label", "On this page");

      var rail = document.createElement("div");
      rail.className = "toc-rail";
      rail.setAttribute("aria-hidden", "true");
      var fill = document.createElement("div");
      fill.className = "toc-rail-fill";
      rail.appendChild(fill);

      var list = document.createElement("ol");
      list.className = "toc-list";

      items.forEach(function (item) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + item.id;
        a.textContent = item.label;
        li.appendChild(a);
        list.appendChild(li);
        tocLinks.push(a);
        tocHeadings.push(item.heading);
      });

      toc.appendChild(rail);
      toc.appendChild(list);
      document.body.appendChild(toc);
      document.body.classList.add("has-toc");
    }
  }

  if (progress || tocLinks.length) {
    var ticking = false;

    function updateProgress() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      doc.style.setProperty("--progress", ratio.toFixed(4));

      // Highlight the section the reader is currently in
      if (tocLinks.length) {
        var current = 0;
        var threshold = window.scrollY + window.innerHeight * 0.3;
        for (var i = 0; i < tocHeadings.length; i++) {
          var top = tocHeadings[i].getBoundingClientRect().top + window.scrollY;
          if (top <= threshold) current = i;
        }
        for (var j = 0; j < tocLinks.length; j++) {
          tocLinks[j].classList.toggle("is-active", j === current);
          if (j === current) {
            tocLinks[j].setAttribute("aria-current", "true");
          } else {
            tocLinks[j].removeAttribute("aria-current");
          }
        }
      }
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(updateProgress);
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", updateProgress);
    updateProgress();
  }
})();

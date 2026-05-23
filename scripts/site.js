const state = {
  tracks: [],
  summary: {},
  filter: "all",
  currentTrackId: null,
  currentConsoleId: "",
  queueIds: [],
};

const grid = document.querySelector("#trackGrid");
const chapterCards = document.querySelector("#chapterCards");
const consolePlayer = document.querySelector("#consolePlayer");
const consoleList = document.querySelector("#consoleList");
const randomLyric = document.querySelector("#randomLyric");
const chapterNav = document.querySelector("#chapterNav");
const chapterList = document.querySelector("#chapterList");
const dialog = document.querySelector("#trackDialog");
const dialogBody = document.querySelector("#dialogBody");
const closeButton = document.querySelector(".dialog-close");

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function externalLink(url, label) {
  if (!url) return `<span class="disabled">${escapeHTML(label)}</span>`;
  return `<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(label)}</a>`;
}

function formatGeneratedAt(value) {
  if (!value) return "Local sync";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "Syncing";
  return String(value).replaceAll("-", ".");
}

function formatSingleNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");
  const suffix = number % 100 >= 11 && number % 100 <= 13
    ? "th"
    : { 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th";
  return `${number}${suffix} single`;
}

function trackById(trackId) {
  return state.tracks.find((track) => track.track_id === trackId);
}

function tracksByEra(code) {
  return state.tracks.filter((track) => track.era.code === code);
}

function shuffledQueueIds() {
  return [...state.tracks]
    .sort(() => Math.random() - 0.5)
    .slice(0, 8)
    .map((track) => track.track_id);
}

function updateSummary() {
  const values = {
    tracks: state.summary.tracks,
    generated: formatGeneratedAt(state.summary.generated_at),
  };
  document.querySelectorAll("[data-summary]").forEach((node) => {
    const key = node.getAttribute("data-summary");
    node.textContent = values[key] ?? node.textContent;
  });
}

function renderConsole() {
  if (!consolePlayer || !consoleList) return;
  const queueIds = state.queueIds.length ? state.queueIds : state.tracks.slice(0, 8).map((track) => track.track_id);
  if (!state.currentConsoleId || !queueIds.includes(state.currentConsoleId)) {
    state.currentConsoleId = queueIds[0] || "";
  }

  const selected = trackById(state.currentConsoleId) || state.tracks[0];
  if (!selected) return;
  const media = selected.teaser_video
    ? `<video controls muted autoplay loop playsinline poster="${selected.thumbnail}">
        <source src="${selected.teaser_video}" type="video/mp4">
      </video>`
    : `<img src="${selected.thumbnail}" alt="${escapeHTML(selected.title)}">`;

  consolePlayer.innerHTML = `
    <div>${media}</div>
    <div class="console-player-copy">
      <p class="section-marker">Track ${escapeHTML(selected.track_id)}</p>
      <h2>${escapeHTML(selected.title)}</h2>
      <p>${escapeHTML((selected.lyrics_excerpt || []).slice(0, 2).join(" / "))}</p>
      <div class="track-links">
        ${externalLink(selected.spotify_url, "Spotify")}
        ${externalLink(selected.apple_url, "Apple Music")}
        ${externalLink(selected.x_teaser_url, "X teaser")}
      </div>
    </div>
  `;

  consoleList.innerHTML = queueIds.map(trackById).filter(Boolean).map((track) => `
    <button class="console-item${track.track_id === selected.track_id ? " is-active" : ""}" type="button" data-console-track="${escapeHTML(track.track_id)}">
      <img src="${track.thumbnail}" alt="${escapeHTML(track.track_id)} ${escapeHTML(track.title)}">
      <span>
        <strong>${escapeHTML(track.track_id)} / ${escapeHTML(track.title)}</strong>
        <span>${escapeHTML(track.era.code)} / ${escapeHTML(formatDate(track.release_date))}</span>
      </span>
      <span class="console-track-link">Play</span>
    </button>
  `).join("");
}

function renderRandomLyric() {
  if (!randomLyric) return;
  const candidates = state.tracks.flatMap((track) => (
    (track.lyrics_excerpt || []).map((line) => ({
      track,
      line: String(line || "").trim(),
    }))
  )).filter((item) => item.line.length > 3 && !/^[\s*._-]+$/.test(item.line));

  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  if (!selected) {
    randomLyric.innerHTML = "";
    return;
  }

  randomLyric.innerHTML = `
    <blockquote>${escapeHTML(selected.line)}</blockquote>
    <button type="button" data-track="${escapeHTML(selected.track.track_id)}">
      ${escapeHTML(selected.track.track_id)} / ${escapeHTML(selected.track.title)}
    </button>
  `;
}

function renderChapterCards() {
  if (!chapterCards) return;
  const eras = state.summary.eras || [];
  chapterCards.innerHTML = eras.map((era) => {
    const preview = tracksByEra(era.code).slice(0, 6).map((track) => `
      <button type="button" data-track="${escapeHTML(track.track_id)}" aria-label="Open ${escapeHTML(track.title)}">
        <img src="${track.thumbnail}" alt="${escapeHTML(track.track_id)} ${escapeHTML(track.title)}">
        <span>${escapeHTML(track.track_id)}</span>
      </button>
    `).join("");
    return `
      <article class="ledger-row">
        <div class="ledger-mark">${escapeHTML(era.code)}</div>
        <div class="ledger-name">
          <strong>${escapeHTML(era.name)}</strong>
          <span>${escapeHTML(era.range)}</span>
        </div>
        <div class="ledger-strip">${preview}</div>
        <a class="chapter-count" href="chapter.html?era=${encodeURIComponent(era.code)}">${escapeHTML(era.count)} works</a>
      </article>
    `;
  }).join("");
}

function trackMatchesFilter(track) {
  if (state.filter === "all") return true;
  if (state.filter === "ja") return track.language === "ja";
  if (state.filter === "en") return track.language === "en";
  if (state.filter === "ready") return Boolean(track.x_teaser_url);
  if (state.filter === "latest") return track.track_num >= 85;
  return true;
}

function renderTracks() {
  if (!grid) return;
  const tracks = state.tracks.filter(trackMatchesFilter);
  grid.innerHTML = tracks.map((track) => `
    <article class="track-card">
      <button type="button" data-track="${track.track_id}" aria-label="Open ${escapeHTML(track.title)}">
        <img src="${track.thumbnail}" alt="${escapeHTML(track.track_id)} ${escapeHTML(track.title)}">
      </button>
      <div class="track-card-body">
        <div>
          <div class="track-meta">
            ${escapeHTML(track.track_id)} / ${escapeHTML(track.language.toUpperCase())} / ${escapeHTML(track.era.code)}
          </div>
          <h3 class="track-title">${escapeHTML(track.title)}</h3>
        </div>
        <div>
          <div class="track-status">${escapeHTML(track.public_status)}</div>
          <div class="track-links">
            ${externalLink(track.spotify_url, "Spotify")}
            ${externalLink(track.apple_url, "Apple")}
            ${externalLink(track.x_teaser_url, "X Teaser")}
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function renderChapterPage() {
  if (!chapterList || !chapterNav) return;
  const eras = state.summary.eras || [];
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("era") || "I";
  const currentEra = eras.find((era) => era.code === requested) || eras[0];
  const tracks = tracksByEra(currentEra.code);

  document.title = `Chapter ${currentEra.code} - S.K_mofu / K.S_mofu`;
  const title = document.querySelector("#chapterPageTitle");
  const lead = document.querySelector("#chapterPageLead");
  if (title) title.textContent = `Chapter ${currentEra.code} / ${currentEra.name}`;
  if (lead) {
    lead.textContent = `${currentEra.range} / ${tracks.length} works. Release date, single number, album art, streaming links, and teaser entry are listed together.`;
  }

  chapterNav.innerHTML = eras.map((era) => `
    <a href="chapter.html?era=${encodeURIComponent(era.code)}" ${era.code === currentEra.code ? 'aria-current="page"' : ""}>
      ${escapeHTML(era.code)} / ${escapeHTML(era.range)}
    </a>
  `).join("");

  chapterList.innerHTML = tracks.map((track) => `
    <article class="chapter-track">
      <button type="button" data-track="${escapeHTML(track.track_id)}" aria-label="Open ${escapeHTML(track.title)}">
        <img src="${track.album_art || track.thumbnail}" alt="${escapeHTML(track.title)} album art">
      </button>
      <div>
        <h2>${escapeHTML(track.track_id)} / ${escapeHTML(track.title)}</h2>
        <small>${escapeHTML(track.language.toUpperCase())} / ${escapeHTML(track.public_status)}</small>
      </div>
      <div class="chapter-meta"><span>Released</span><strong>${escapeHTML(formatDate(track.release_date))}</strong></div>
      <div class="chapter-meta"><span>No.</span><strong>${escapeHTML(track.release_no_label || "Syncing")}</strong></div>
      <div class="chapter-meta"><span>Single</span><strong>${escapeHTML(formatSingleNumber(track.single_number))}</strong></div>
      <div class="track-links">
        ${externalLink(track.spotify_url, "Spotify")}
        ${externalLink(track.apple_url, "Apple")}
        ${externalLink(track.x_teaser_url, "X teaser")}
      </div>
    </article>
  `).join("");
}

function openTrack(trackId) {
  if (!dialog || !dialogBody) return;
  const track = trackById(trackId);
  if (!track) return;
  stopDialogMedia();
  state.currentTrackId = track.track_id;
  const counterpart = state.tracks.find((item) => item.track_num === track.counterpart_track_num);
  const media = track.teaser_video
    ? `<video class="detail-video" controls autoplay playsinline poster="${track.thumbnail}">
        <source src="${track.teaser_video}" type="video/mp4">
      </video>`
    : `<img src="${track.thumbnail}" alt="${escapeHTML(track.track_id)} ${escapeHTML(track.title)}">`;

  dialogBody.innerHTML = `
    <div class="detail-layout">
      <div class="detail-media">${media}</div>
      <div class="detail-copy">
        <p class="section-marker">Track ${escapeHTML(track.track_id)}</p>
        <h2 id="dialogTitle">${escapeHTML(track.title)}</h2>
        <p class="detail-meta">
          ${escapeHTML(track.language.toUpperCase())} / Chapter ${escapeHTML(track.era.code)} / ${escapeHTML(track.public_status)}
        </p>
        <div class="release-panel">
          <img src="${track.album_art || track.thumbnail}" alt="${escapeHTML(track.title)} album art">
          <dl>
            <div><dt>No.</dt><dd>${escapeHTML(track.release_no_label || "No. syncing")}</dd></div>
            <div><dt>Release</dt><dd>${escapeHTML(formatDate(track.release_date) || "Release date syncing")}</dd></div>
            <div><dt>Single</dt><dd>${escapeHTML(formatSingleNumber(track.single_number || track.track_num))}</dd></div>
          </dl>
        </div>
        <div class="detail-links">
          ${externalLink(track.spotify_url, "Spotify")}
          ${externalLink(track.apple_url, "Apple Music")}
          ${externalLink(track.x_release_url, "X Release")}
          ${externalLink(track.x_teaser_url, "X Teaser")}
        </div>
        <p class="detail-meta">
          Paired work: ${counterpart ? `${escapeHTML(counterpart.track_id)} / ${escapeHTML(counterpart.title)}` : "none"}
        </p>
        <div class="detail-nav" aria-label="Track navigation">
          <button type="button" data-dialog-jump="-1">Previous</button>
          <button type="button" data-dialog-jump="1">Next</button>
        </div>
      </div>
    </div>
  `;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function stopDialogMedia() {
  if (!dialogBody) return;
  dialogBody.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
    video.load();
  });
}

function openAdjacentTrack(direction) {
  const currentIndex = state.tracks.findIndex((track) => track.track_id === state.currentTrackId);
  if (currentIndex < 0) return;
  const nextIndex = (currentIndex + direction + state.tracks.length) % state.tracks.length;
  openTrack(state.tracks[nextIndex].track_id);
}

function bindEvents() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.filter = button.dataset.filter;
      renderTracks();
    });
  });

  document.addEventListener("click", (event) => {
    const consoleButton = event.target.closest("[data-console-track]");
    if (consoleButton) {
      state.currentConsoleId = consoleButton.dataset.consoleTrack;
      renderConsole();
      return;
    }

    const trackButton = event.target.closest("[data-track]");
    if (trackButton) {
      openTrack(trackButton.dataset.track);
      return;
    }

    const jumpButton = event.target.closest("[data-dialog-jump]");
    if (jumpButton) {
      openAdjacentTrack(Number(jumpButton.dataset.dialogJump));
      return;
    }

    if (event.target === dialog) dialog.close();
  });

  if (closeButton) {
    closeButton.addEventListener("click", () => dialog.close());
  }

  if (dialog) {
    dialog.addEventListener("close", stopDialogMedia);
  }

  document.addEventListener("keydown", (event) => {
    if (!dialog?.open) return;
    if (event.key === "ArrowLeft") openAdjacentTrack(-1);
    if (event.key === "ArrowRight") openAdjacentTrack(1);
  });
}

async function init() {
  const response = await fetch("data/tracks.json");
  const data = await response.json();
  state.summary = data.summary;
  state.tracks = data.tracks;
  state.queueIds = shuffledQueueIds();
  state.currentConsoleId = state.queueIds[0] || "";

  updateSummary();
  renderConsole();
  renderRandomLyric();
  renderChapterCards();
  renderTracks();
  renderChapterPage();
  bindEvents();
}

init().catch((error) => {
  if (grid) grid.innerHTML = `<p>Archive data could not be loaded.</p>`;
  if (chapterList) chapterList.innerHTML = `<p>Archive data could not be loaded.</p>`;
  console.error(error);
});

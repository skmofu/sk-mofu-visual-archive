const state = {
  tracks: [],
  summary: {},
  filter: "all",
  currentTrackId: null,
};

const grid = document.querySelector("#trackGrid");
const eraShelves = document.querySelector("#eraShelves");
const videoIndex = document.querySelector("#videoIndex");
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
  if (!url) return `<span>${escapeHTML(label)}</span>`;
  return `<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(label)}</a>`;
}

function updateSummary() {
  const values = {
    tracks: state.summary.tracks,
    lyrics: state.summary.lyrics_ready,
    teasers: state.summary.x_teaser_ready,
    generated: formatGeneratedAt(state.summary.generated_at),
  };
  document.querySelectorAll("[data-summary]").forEach((node) => {
    const key = node.getAttribute("data-summary");
    node.textContent = values[key] ?? node.textContent;
  });
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

function renderEraShelves() {
  const eras = state.summary.eras || [];
  eraShelves.innerHTML = eras.map((era) => {
    const tracks = state.tracks
      .filter((track) => track.era.code === era.code);
    const thumbs = tracks.map((track) => (
      `<button type="button" data-track="${track.track_id}" aria-label="Play ${escapeHTML(track.title)} teaser">
        <img src="${track.thumbnail}" alt="${escapeHTML(track.track_id)} ${escapeHTML(track.title)}">
        <span>${escapeHTML(track.track_id)}</span>
      </button>`
    )).join("");

    return `
      <article class="era-row">
        <div class="era-info">
          <strong>${escapeHTML(era.code)}</strong>
          <span>${escapeHTML(era.name)}<br>${escapeHTML(era.range)}</span>
        </div>
        <div class="era-strip">${thumbs}</div>
        <div class="era-count">${escapeHTML(era.count)} works</div>
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
  const tracks = state.tracks.filter(trackMatchesFilter);
  grid.innerHTML = tracks.map((track) => {
    const statusClass = track.x_teaser_url ? "" : " disabled";
    return `
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
              ${track.spotify_url ? `<a class="track-link" href="${escapeHTML(track.spotify_url)}" target="_blank" rel="noreferrer">Spotify</a>` : `<span class="track-link disabled">Spotify</span>`}
              ${track.apple_url ? `<a class="track-link" href="${escapeHTML(track.apple_url)}" target="_blank" rel="noreferrer">Apple</a>` : `<span class="track-link disabled">Apple</span>`}
              ${track.x_teaser_url ? `<a class="track-link" href="${escapeHTML(track.x_teaser_url)}" target="_blank" rel="noreferrer">X Teaser</a>` : `<span class="track-link${statusClass}">X Teaser</span>`}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderVideoIndex() {
  const selected = state.tracks.filter((track) =>
    ["001", "009", "016", "055", "091", "097", "099", "100"].includes(track.track_id)
  );
  videoIndex.innerHTML = selected.map((track) => `
    <li>
      <span>${escapeHTML(track.track_id)}</span>
      <span>${escapeHTML(track.title)} / ${escapeHTML(track.public_status)}</span>
    </li>
  `).join("");
}

function openTrack(trackId) {
  const track = state.tracks.find((item) => item.track_id === trackId);
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
            <div><dt>Release</dt><dd>${escapeHTML(track.release_date || "Release date syncing")}</dd></div>
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

function formatSingleNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");
  const suffix = number % 100 >= 11 && number % 100 <= 13
    ? "th"
    : { 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th";
  return `${number}${suffix} single`;
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

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-track]");
    if (!button) return;
    openTrack(button.dataset.track);
  });

  eraShelves.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-track]");
    if (!button) return;
    openTrack(button.dataset.track);
  });

  closeButton.addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    const jumpButton = event.target.closest("button[data-dialog-jump]");
    if (jumpButton) {
      openAdjacentTrack(Number(jumpButton.dataset.dialogJump));
      return;
    }
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    stopDialogMedia();
  });

  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowLeft") openAdjacentTrack(-1);
    if (event.key === "ArrowRight") openAdjacentTrack(1);
  });
}

function stopDialogMedia() {
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

async function init() {
  const response = await fetch("data/tracks.json");
  const data = await response.json();
  state.summary = data.summary;
  state.tracks = data.tracks;
  updateSummary();
  renderEraShelves();
  renderTracks();
  renderVideoIndex();
  bindEvents();
}

init().catch((error) => {
  grid.innerHTML = `<p>Archive data could not be loaded.</p>`;
  console.error(error);
});

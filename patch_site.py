#!/usr/bin/env python3
"""sk-mofu-visual-archive へ GoatCounter計測 + 販売出口(UTM付き) を組み込む。"""
import sys
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent
SITE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$")
COUNT_TAG_RE = re.compile(
    r'<script data-goatcounter="https://(?P<site>[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?)\.goatcounter\.com/count" '
    r'async src="//gc\.zgo\.at/count\.js"></script>'
)
COUNT_MARKER = 'data-goatcounter='
LOADER_MARKER = '//gc.zgo.at/count.js'
OUTBOUND_MARKER = '/sk-mofu-visual-archive/scripts/gc-outbound.js'

def gc_snippet(site_code):
    return (
        f'  <script data-goatcounter="https://{site_code}.goatcounter.com/count" '
        'async src="//gc.zgo.at/count.js"></script>\n'
        '  <script src="/sk-mofu-visual-archive/scripts/gc-outbound.js"></script>\n'
    )

STORE_SECTION = """
    <section id="store" class="press-section" aria-labelledby="store-title">
      <div>
        <p class="section-marker">Store / Support</p>
        <h2 id="store-title">Game music packs &amp; field notes</h2>
      </div>
      <div class="press-grid">
        <p>
          Royalty-free vocal music packs for games and films on itch.io,
          and process notes on note. Every purchase keeps the archive growing.
        </p>
        <dl>
          <div><dt>Music packs</dt><dd><a href="https://mofu-sk.itch.io/?utm_source=hp&amp;utm_medium=hub&amp;utm_campaign=store_shelf" rel="noopener">itch.io shop</a></dd></div>
          <div><dt>Field notes</dt><dd><a href="https://note.com/s_k_mofu?utm_source=hp&amp;utm_medium=hub&amp;utm_campaign=field_notes" rel="noopener">note</a></dd></div>
        </dl>
      </div>
    </section>
"""


def validate_site_code(site_code):
    if not SITE_RE.fullmatch(site_code):
        raise ValueError("invalid GoatCounter site code")
    return site_code


def render_html(path, site_code):
    s = path.read_text(encoding="utf-8")
    original = s
    changed = False
    count_markers = s.count(COUNT_MARKER)
    loader_markers = s.count(LOADER_MARKER)
    outbound_markers = s.count(OUTBOUND_MARKER)
    count_tags = list(COUNT_TAG_RE.finditer(s))
    if count_markers == loader_markers == outbound_markers == 0:
        assert "</body>" in s, path
        s = s.replace("</body>", gc_snippet(site_code) + "</body>", 1)
        changed = True
    elif not (
        count_markers == loader_markers == outbound_markers == len(count_tags) == 1
    ):
        raise ValueError(f"partial, duplicate, or malformed GoatCounter markup: {path}")
    else:
        old_tag = count_tags[0].group(0)
        new_tag = old_tag.replace(
            f'https://{count_tags[0].group("site")}.goatcounter.com/count',
            f'https://{site_code}.goatcounter.com/count',
        )
        if old_tag != new_tag:
            s = s[:count_tags[0].start()] + new_tag + s[count_tags[0].end():]
            changed = True
    if path.name == "index.html" and 'id="store"' not in s:
        anchor = '    <section id="press"'
        assert anchor in s, "press section anchor not found"
        s = s.replace(anchor, STORE_SECTION + "\n" + anchor, 1)
        changed = True
    return s, changed and s != original


def main():
    if len(sys.argv) > 2:
        raise ValueError("expected at most one GoatCounter site code")
    site_code = validate_site_code(sys.argv[1] if len(sys.argv) == 2 else "skksmofu")
    htmls = [REPO / "index.html", REPO / "chapter.html"] + sorted((REPO / "pinterest").glob("*.html"))
    rendered = []
    for p in htmls:
        if p.exists():
            content, changed = render_html(p, site_code)
            rendered.append((p, content, changed))
    for p, content, changed in rendered:
        if changed:
            p.write_text(content, encoding="utf-8")
        print(("patched " if changed else "skip(既適用) ") + str(p.relative_to(REPO)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

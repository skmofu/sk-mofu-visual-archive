#!/usr/bin/env python3
"""sk-mofu-visual-archive へ GoatCounter計測 + 販売出口(UTM付き) を組み込む。"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
SITE_CODE = sys.argv[1] if len(sys.argv) > 1 else "skmofu"

GC_SNIPPET = (
    '  <script data-goatcounter="https://%s.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>\n'
    '  <script src="/sk-mofu-visual-archive/scripts/gc-outbound.js"></script>\n'
) % SITE_CODE

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


def patch_html(path):
    s = path.read_text(encoding="utf-8")
    changed = False
    if "goatcounter" not in s:
        assert "</body>" in s, path
        s = s.replace("</body>", GC_SNIPPET + "</body>", 1)
        changed = True
    if path.name == "index.html" and 'id="store"' not in s:
        anchor = '    <section id="press"'
        assert anchor in s, "press section anchor not found"
        s = s.replace(anchor, STORE_SECTION + "\n" + anchor, 1)
        changed = True
    if changed:
        path.write_text(s, encoding="utf-8")
    return changed


def main():
    htmls = [REPO / "index.html", REPO / "chapter.html"] + sorted((REPO / "pinterest").glob("*.html"))
    for p in htmls:
        if p.exists():
            print(("patched " if patch_html(p) else "skip(既適用) ") + str(p.relative_to(REPO)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

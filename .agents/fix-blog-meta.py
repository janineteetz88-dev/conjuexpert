#!/usr/bin/env python3
"""
Automatischer Metadaten-Fix für ConjuExpert Blog-Artikel.
Ändert NUR Metadaten – niemals Body-Content.

Fixes:
- <title> > 60 Zeichen: kürzt auf 60 (Kürzung mit "…")
- <meta description> > 160 Zeichen: kürzt auf 158 + "…"
- JSON-LD dateModified: aktualisiert auf heute
- JSON-LD author: stellt sicher dass Person-Typ gesetzt ist
- Fehlende twitter:site ergänzen

Aufruf: python3 .agents/fix-blog-meta.py blog/artikel/index.html [...]
"""

import re
import sys
import json
from pathlib import Path
from datetime import date

AUTHOR_NAME   = "Janine Kreiser"
AUTHOR_TITLE  = "Gründerin"
AUTHOR_ORG    = "ConjuExpert"
TWITTER_SITE  = "@conjuexpert"
TODAY         = date.today().isoformat()

TITLE_MAX = 60
DESC_MAX  = 160


def shorten(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    cut = text[:max_len - 1].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:–-—") + "…"


def fix_file(path: Path) -> list[str]:
    """Returns list of applied changes."""
    content = path.read_text(encoding="utf-8")
    original = content
    changes = []

    # --- <title> ---
    m = re.search(r"(<title>)(.*?)(</title>)", content, re.DOTALL)
    if m:
        t = m.group(2)
        if len(t) > TITLE_MAX:
            new_t = shorten(t, TITLE_MAX)
            content = content[:m.start(2)] + new_t + content[m.end(2):]
            changes.append(f"title: {len(t)} → {len(new_t)} Zeichen")

    # --- meta description ---
    m = re.search(r'(<meta name="description" content=")(.*?)(")', content, re.DOTALL)
    if m:
        d = m.group(2)
        if len(d) > DESC_MAX:
            new_d = shorten(d, DESC_MAX)
            content = content[:m.start(2)] + new_d + content[m.end(2):]
            changes.append(f"description: {len(d)} → {len(new_d)} Zeichen")

    # --- JSON-LD: dateModified + author ---
    def patch_jsonld(m_ld):
        raw = m_ld.group(1)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return m_ld.group(0)

        graphs = data.get("@graph", [data])
        modified = False

        for node in graphs:
            if node.get("@type") in ("BlogPosting", "Article", "NewsArticle"):
                # dateModified
                if node.get("dateModified", "") != TODAY:
                    node["dateModified"] = TODAY
                    modified = True

                # author → Person
                author = node.get("author", {})
                if isinstance(author, dict):
                    if author.get("@type") != "Person" or author.get("name") != AUTHOR_NAME:
                        node["author"] = {
                            "@type": "Person",
                            "name": AUTHOR_NAME,
                            "jobTitle": AUTHOR_TITLE,
                            "worksFor": {"@type": "Organization", "name": AUTHOR_ORG}
                        }
                        modified = True

        if not modified:
            return m_ld.group(0)

        if "@graph" in data:
            data["@graph"] = graphs
            new_json = data
        else:
            new_json = graphs[0]

        return (
            m_ld.group(0).split(raw)[0]
            + json.dumps(new_json, ensure_ascii=False, indent=2)
            + m_ld.group(0).split(raw)[-1]
        )

    before = content
    content = re.sub(
        r'<script type="application/ld\+json">(.*?)</script>',
        patch_jsonld,
        content,
        flags=re.DOTALL,
    )
    if content != before:
        changes.append("JSON-LD: dateModified + author aktualisiert")

    # --- twitter:site ---
    if 'twitter:card' in content and 'twitter:site' not in content:
        content = content.replace(
            'name="twitter:card"',
            f'name="twitter:site" content="{TWITTER_SITE}" />\n<meta name="twitter:card"',
        )
        changes.append("twitter:site ergänzt")

    if content != original:
        path.write_text(content, encoding="utf-8")

    return changes


def main():
    files = [Path(f) for f in sys.argv[1:] if Path(f).exists()]
    if not files:
        print("Nutzung: python3 fix-blog-meta.py blog/artikel/index.html ...")
        sys.exit(0)

    total_changes = 0
    for path in files:
        changes = fix_file(path)
        if changes:
            print(f"✅ {path}")
            for c in changes:
                print(f"   • {c}")
            total_changes += len(changes)
        else:
            print(f"✓  {path} – keine Änderungen nötig")

    print(f"\n{total_changes} Fixes in {len(files)} Datei(en).")


if __name__ == "__main__":
    main()

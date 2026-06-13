# SSG-Evaluation: Statisches HTML für LLM-Crawler

Datum: 2026-06-13  
Kontext: conjuexpert.app — statische HTML-Blog-Artikel, React-JSX-App im Browser,
GitHub Pages, kein Build-Tool.

---

## a) Minimaler Schritt zum crawlbaren HTML

### Option A — Node-Prerender-Script (empfohlen als erster Schritt)

Ein Node-Script (`scripts/prerender-blog-nav.js`) liest `clusters.js`,
berechnet Breadcrumb + HubLink + RelatedCards für jeden Blog-Slug und
schreibt die HTML-Snippets direkt in die bestehenden statischen HTML-Dateien
(z.B. als ersetzbare `<!-- CLUSTER_NAV_START -->…<!-- CLUSTER_NAV_END -->`-Marker).

**Vorgehen:**
1. Marker-Kommentare in alle blog/*/index.html einfügen (einmalig)
2. Script läuft lokal oder in GitHub Actions vor dem Push
3. Generiertes HTML ist statisch → für LLM-Crawler sichtbar
4. Kein Framework, kein npm-Build, keine Änderung am Deployment

**Einschränkung:** Reziproke Gegenlinks (B linkt zurück zu A) werden
hier schon möglich — das Script kennt alle Links aus clusters.js.

---

### Option B — Vite + vite-ssg

Migration des App-Bundles auf Vite, dann vite-ssg für pre-rendering.
Betrifft hauptsächlich `index.html` (Konjugator-App), NICHT die Blog-Artikel
(die sind bereits statisch). Vorteil: zukünftige Verb-Seiten (`/konjugation/`)
könnten pre-gerendert werden.

---

### Option C — Astro-Migration

Kompletter Rebuild beider Teile (Blog + App) in Astro. Maximale Kontrolle,
Content-Collections für Blog, Islands für die React-App. Größter Aufwand.

---

## b) Umbauaufwand (grobe Schätzung)

| Option | Aufwand | Risiko |
|--------|---------|--------|
| A — Node-Script | ~4–6 h | niedrig — kein Framework-Risiko |
| B — Vite + vite-ssg | ~16–24 h | mittel — Build-Pipeline neu aufbauen |
| C — Astro | ~40–60 h | hoch — vollständige Migration |

---

## c) Empfehlung

**Sofort: Option A** — Node-Prerender-Script.

Begründung:
- Löst das LLM-Crawler-Problem für Blog-Artikel sofort
- Kein Risiko für die laufende Produktionsseite
- clusters.js ist bereits angelegt — das Script kann direkt darauf aufbauen
- GitHub Actions kann das Script automatisch bei jedem Push ausführen

**Danach (Q3/Q4):** Option B nur wenn Verb-Seiten (`/konjugation/`) ebenfalls
für LLM-Crawler gecrawlt werden sollen. Blog ist mit Option A bereits versorgt.

**Option C:** Nicht empfohlen ohne konkreten Anlass (z.B. Performance-Probleme,
Content-Team braucht CMS, Redakteure ohne HTML-Kenntnisse).

---

## Nächster Schritt wenn freigegeben

```
scripts/prerender-blog-nav.js  — liest clusters.js, schreibt HTML-Marker
.github/workflows/prerender.yml — führt Script vor Deployment aus
```

Kein Code ohne Freigabe.

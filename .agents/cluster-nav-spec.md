# Cluster-Nav — Spezifikation

Quelle: Janine Kreiser, 2026-06-13

## Kontext

Interne Verlinkungsarchitektur (SEO + GEO). Vier Elemente werden von einer
Engine generiert, NICHT vom Autor gesetzt:

1. Breadcrumb-Navigation (Ebene 0 → 1 → 2 → 3)
2. „Hoch zum Hub"-Link
3. Reziproke Gegenlinks (A→B → B bekommt automatisch Gegenlink zu A)
4. `.related`-Block (3 Karten: Geschwister-Spokes desselben Clusters)

**Kritisch:** LLM-Crawler (ChatGPT, Claude, Perplexity) führen kein JavaScript
aus. Alle Links müssen im server-gerenderten HTML stehen.

## Dateien

- `src/data/clusters.js` — Single Source of Truth für Cluster-Zuordnungen
- `src/components/ClusterNav.jsx` — React-Komponenten (Client-Side, Übergangslösung)
- `.agents/ssg-evaluation.md` — SSG/Prerender-Entscheidungsmatrix

## Leitplanken

- Schritte 1 und 2 (Datei + Komponenten) sofort umsetzbar, unabhängig von SSR/SSG.
- Reziproke Gegenlinks kommen erst NACH SSG — client-seitig für LLM-Crawler unsichtbar.
- Kein Push auf main ohne Freigabe (alles als PR/Branch vorlegen).
- Keine npm-Pakete hinzufügen ohne Rückfrage.

## Fertig wenn

- `src/data/clusters.js` existiert mit Spanisch-Cluster vollständig (live-Spokes)
- `src/components/ClusterNav.jsx` exportiert Breadcrumb, HubLink, RelatedCards
- SSG-Evaluation liegt schriftlich vor (`.agents/ssg-evaluation.md`)
- Diff / PR-Link vorgelegt, kein Live-Deploy ohne Freigabe

# Routine: Blogartikel-Tracker ↔ Repo-Abgleich

Quelle: Janine Kreiser, 2026-06-13

## Wann

Bei jedem Push, der Blog-Artikel betrifft.
Läuft automatisch im Pre-Push-Hook (nach SEO-Audit).

## Quelle der Wahrheit

Repo (`main`-Branch) = was auf https://conjuexpert.app/blog deployed wird.

## Notion-Datenbank

„Blogartikel-Tracker" in *04 — Marketing & Wachstum › Blogartikel*
Database ID: `f78defbe1d0543309b443fc134ad9127`

## Abgleich-Regeln

1. Im Repo live, **nicht** im Tracker → Eintrag anlegen (mit `--create`)
2. Im Tracker „Veröffentlicht", **nicht** im Repo → Abweichung melden (NICHT stillschweigend ändern)
3. Titel / URL / Datum gegenprüfen

## Script

`scripts/sync-notion-tracker.mjs`

Aufruf:
- `node scripts/sync-notion-tracker.mjs`           → Dry-run (nur Bericht)
- `node scripts/sync-notion-tracker.mjs --create`  → fehlende Einträge anlegen

## Voraussetzung

```bash
export NOTION_API_KEY=secret_xxx
```

Ohne API-Key wird der Schritt übersprungen (kein Block).

## Quellen für „live"-Artikel

1. `src/data/clusters.js` → Spokes mit `live: true` + Global Pillar
2. Alle `blog/*/index.html` mit `robots: index` (für Story-Artikel außerhalb der Cluster)

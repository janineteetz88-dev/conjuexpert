# Search-Console-Automatisierung

Reicht die `sitemap.xml` automatisch bei der Google Search Console (GSC) ein —
einmal eingerichtet, danach bei jeder Sitemap-Änderung von selbst.

## Wie es funktioniert

- **Workflow:** `.github/workflows/submit-sitemap.yml`
- **Skript:** `scripts/submit-sitemap.mjs` (zero-dependency, Node 20+)

Der Workflow läuft:

1. **automatisch** bei jedem Push auf `main`, der `sitemap.xml` ändert, **und**
2. **manuell** per *Run workflow* (für den ersten Submit).

Das Skript signiert ein Service-Account-JWT (Node `crypto`), tauscht es gegen
ein OAuth-Token und schickt einen `PUT` an die Search-Console-Sitemaps-API.
Keine npm-Abhängigkeiten nötig.

## Einmalige Einrichtung

### 1. Service-Account anlegen (Google Cloud)

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt wählen/anlegen.
2. **APIs & Dienste → Bibliothek** → „Google Search Console API" → **Aktivieren**.
3. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → Dienstkonto**.
4. Dienstkonto anlegen → beim Konto **Schlüssel → Schlüssel hinzufügen → JSON**
   herunterladen. Diese JSON-Datei ist der `GSC_SA_KEY`.

### 2. Service-Account in der Search Console berechtigen

1. [Search Console](https://search.google.com/search-console) → Property
   `conjuexpert.app`.
2. **Einstellungen → Nutzer und Berechtigungen → Nutzer hinzufügen**.
3. Die **Dienstkonto-E-Mail** (`...@...iam.gserviceaccount.com` aus dem JSON,
   Feld `client_email`) als **Inhaber** bzw. mit **vollständiger** Berechtigung
   hinzufügen.

### 3. GitHub-Secret setzen

1. GitHub → Repo `conjuexpert-app` → **Settings → Secrets and variables →
   Actions → New repository secret**.
2. Name: `GSC_SA_KEY`
3. Wert: der **komplette Inhalt** der JSON-Schlüsseldatei (alles einfügen).

### 4. Erster Submit

GitHub → **Actions → „Submit sitemap to Google Search Console" → Run workflow**.
Ein Klick. Danach läuft es bei jeder Sitemap-Änderung automatisch.

## Domain-Property statt URL-Prefix?

Ist die GSC-Property eine **Domain-Property** (statt URL-Prefix), in
`.github/workflows/submit-sitemap.yml` setzen:

```yaml
SITE_URL: 'sc-domain:conjuexpert.app'
```

## Lokal testen

```bash
GSC_SA_KEY="$(cat service-account.json)" node scripts/submit-sitemap.mjs
```

Bei Erfolg: `✓ Sitemap submitted to Google Search Console.`
(Die GSC-API antwortet mit `204 No Content`.)

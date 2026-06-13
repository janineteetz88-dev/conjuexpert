#!/usr/bin/env bash
# SEO-Check für geänderte Blog-Artikel (läuft als pre-push Hook oder manuell)
# Nutzung: bash .agents/check-blog-seo.sh [datei.html ...]

SKILL_DIR="${SKILL_DIR:-$HOME/claude-skill-seo-geo-optimizer}"
# Fallback für Remote-Umgebungen wo ~ = /root oder /home/claude
[ -d "$SKILL_DIR" ] || SKILL_DIR="/home/claude/claude-skill-seo-geo-optimizer"
PASS=0
WARN=0
FAIL=0

# Prüfe ob Skill vorhanden
if [ ! -f "$SKILL_DIR/scripts/audit_report.py" ]; then
  echo "⚠️  SEO-Skill nicht gefunden unter $SKILL_DIR – Check übersprungen."
  echo "   git clone https://github.com/199-biotechnologies/claude-skill-seo-geo-optimizer.git ~/claude-skill-seo-geo-optimizer"
  exit 0
fi

# Wenn Dateien übergeben, nur diese prüfen; sonst geänderte Blog-HTML-Dateien
if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  FILES=($(git diff --name-only HEAD 2>/dev/null | grep "^blog/.*\.html$"))
  if [ ${#FILES[@]} -eq 0 ]; then
    FILES=($(git diff --cached --name-only 2>/dev/null | grep "^blog/.*\.html$"))
  fi
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "✅ Keine Blog-HTML-Dateien geändert – SEO-Check übersprungen."
  exit 0
fi

echo "🔍 SEO-Audit für ${#FILES[@]} Blog-Datei(en)…"
echo ""

for FILE in "${FILES[@]}"; do
  [ -f "$FILE" ] || continue
  RESULT=$(python3 "$SKILL_DIR/scripts/audit_report.py" "$FILE" --format all 2>/dev/null | grep "Overall Score")
  SCORE=$(echo "$RESULT" | grep -oP '\d+(?=/100)')

  if [ -z "$SCORE" ]; then
    echo "  ⚠️  $FILE – Score nicht ermittelbar"
    WARN=$((WARN+1))
  elif [ "$SCORE" -ge 80 ]; then
    echo "  ✅ $FILE – $SCORE/100"
    PASS=$((PASS+1))
  elif [ "$SCORE" -ge 60 ]; then
    echo "  ⚠️  $FILE – $SCORE/100 (Ziel: ≥ 80)"
    WARN=$((WARN+1))
  else
    echo "  ❌ $FILE – $SCORE/100 (kritisch, Ziel: ≥ 80)"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "Ergebnis: ✅ $PASS  ⚠️  $WARN  ❌ $FAIL"
echo "Berichte: ~/Documents/SEO_Audit_*"

# Bei kritischen Treffern (< 60) warnen, aber nicht blocken
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "⚠️  $FAIL Artikel unter 60/100. Empfehlung: Audit-Bericht lesen und Fixes einpflegen."
fi

exit 0

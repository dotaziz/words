#!/bin/bash
# Words Dictionary - Global Hotkey Lookup
# 
# SETUP:
# 1. Copy to ~/.local/bin/words-lookup.sh
# 2. chmod +x ~/.local/bin/words-lookup.sh
# 3. Bind to keyboard shortcut in your DE (recommended: Ctrl+Shift+W)
#    - GNOME: Settings > Keyboard > Custom Shortcuts
#    - KDE: System Settings > Shortcuts > Custom Shortcuts
#
# DEPENDENCIES: xclip, jq, notify-send

set -e

# Configuration
WORDS_DIR="${WORDS_DIR:-$HOME/dev/personal/words}"
NOTIFICATION_TIMEOUT=8000

# Get selected text
WORD=$(xclip -o -selection primary 2>/dev/null || xclip -o 2>/dev/null || echo "")
WORD=$(echo "$WORD" | tr -d '\n' | xargs)

if [ -z "$WORD" ]; then
  notify-send -t 2000 "Words Dictionary" "No text selected"
  exit 0
fi

# Query database
if [ ! -f "$WORDS_DIR/extensions/sqlite/query.js" ]; then
  notify-send -t 3000 "Words Dictionary" "Error: Database not found at $WORDS_DIR"
  exit 1
fi

RESULT=$(node "$WORDS_DIR/extensions/sqlite/query.js" "$WORD" 2>/dev/null)

if [ "$RESULT" = "null" ] || [ -z "$RESULT" ]; then
  notify-send -t 3000 "Words Dictionary" "No definition found for: $WORD"
  exit 0
fi

# Parse with jq (just first definition)
if command -v jq &>/dev/null; then
  PHONETIC=$(echo "$RESULT" | jq -r '.phonetics[0].text // ""' 2>/dev/null)
  PART=$(echo "$RESULT" | jq -r '.meanings[0].partOfSpeech // ""' 2>/dev/null)
  DEF=$(echo "$RESULT" | jq -r '.meanings[0].definitions[0].definition // "No definition"' 2>/dev/null)
  
  TITLE="$WORD"
  [ -n "$PHONETIC" ] && TITLE="$WORD  $PHONETIC"
  
  BODY=""
  [ -n "$PART" ] && BODY="($PART) "
  BODY="${BODY}${DEF}"
  
  notify-send -t $NOTIFICATION_TIMEOUT "$TITLE" "$BODY"
else
  # Fallback without jq
  notify-send -t $NOTIFICATION_TIMEOUT "$WORD" "$(echo "$RESULT" | head -c 200)"
fi

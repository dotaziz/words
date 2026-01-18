#!/bin/bash
# Words Dictionary - Global Hotkey Lookup
#
# SETUP:
# 1. Copy to ~/.local/bin/words-lookup.sh (or run install script)
# 2. chmod +x ~/.local/bin/words-lookup.sh
# 3. Bind to keyboard shortcut in your DE (default: Ctrl+Alt+W)
#    - GNOME: Settings > Keyboard > Custom Shortcuts
#    - KDE: System Settings > Shortcuts > Custom Shortcuts
#
# DEPENDENCIES: xclip, xdotool or wmctrl (optional for window management)

set -e

# Configuration
WORDS_DIR="${WORDS_DIR:-$HOME/.local/share/words}"
WORDS_BIN="${WORDS_BIN:-$HOME/.local/bin/words}"
NOTIFICATION_TIMEOUT=2000
OPEN_APP=true  # Set to false to only show notification

# Get selected text
WORD=$(xclip -o -selection primary 2>/dev/null || xclip -o -selection clipboard 2>/dev/null || echo "")
WORD=$(echo "$WORD" | tr -d '\n' | xargs)

if [ -z "$WORD" ]; then
  notify-send -t 2000 "Words Dictionary" "No text selected"
  exit 0
fi

# Limit word length (prevent accidents)
if [ ${#WORD} -gt 50 ]; then
  notify-send -t 2000 "Words Dictionary" "Selected text too long (max 50 chars)"
  exit 0
fi

# Show quick notification
notify-send -t 1500 "Words Dictionary" "Looking up: $WORD"

# Create search trigger file for the app to read
SEARCH_TRIGGER="$HOME/.cache/words-search.txt"
mkdir -p "$HOME/.cache"
echo "$WORD" > "$SEARCH_TRIGGER"

# Open or focus Words app
if [ "$OPEN_APP" = true ]; then
  # Check if Words app is already running
  if pgrep -x "words" > /dev/null 2>&1; then
    # App is running - try to focus it
    if command -v wmctrl &>/dev/null; then
      wmctrl -a "Words Dictionary" 2>/dev/null || true
    elif command -v xdotool &>/dev/null; then
      xdotool search --name "Words Dictionary" windowactivate 2>/dev/null || true
    fi
  else
    # Start the app
    if [ -f "$WORDS_BIN" ]; then
      "$WORDS_BIN" > /dev/null 2>&1 &
    elif [ -f "./words" ]; then
      ./words > /dev/null 2>&1 &
    else
      notify-send -t 3000 "Words Dictionary" "App not found. Please install it first."
      exit 1
    fi
  fi
fi

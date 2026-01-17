#!/bin/bash
# Words Dictionary - Linux Uninstall Script
# Run: ./uninstall-linux.sh

set -e

echo "Uninstalling Words Dictionary..."

rm -rf "$HOME/.local/share/words"
rm -f "$HOME/.local/bin/words"
rm -f "$HOME/.local/share/applications/words.desktop"
rm -f "$HOME/.local/share/icons/hicolor/256x256/apps/words.svg"

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

echo "✓ Words Dictionary uninstalled"

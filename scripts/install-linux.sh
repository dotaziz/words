#!/bin/bash
# Words Dictionary - Linux Installation Script
# Run: ./install-linux.sh

set -e

APP_NAME="words"
INSTALL_DIR="$HOME/.local/share/words"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"

echo "Installing Words Dictionary..."

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
  x86_64) BINARY="neutralino-linux_x64" ;;
  aarch64) BINARY="neutralino-linux_arm64" ;;
  armv7l) BINARY="neutralino-linux_armhf" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

cp -r resources "$INSTALL_DIR/"
# cp -r database "$INSTALL_DIR/" # Don't bundle database
cp -r extensions "$INSTALL_DIR/"
cp "bin/$BINARY" "$INSTALL_DIR/words"
chmod +x "$INSTALL_DIR/words"

# Create database directory
mkdir -p "$INSTALL_DIR/database"

# Download database
DB_URL="https://github.com/aziz/words_db/releases/download/v1/dict_en_v2.db" # PLACEHOLDER
echo "Downloading dictionary database (68MB)..."
if command -v curl >/dev/null 2>&1; then
  curl -L -o "$INSTALL_DIR/database/dict_en_v2.db" "$DB_URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$INSTALL_DIR/database/dict_en_v2.db" "$DB_URL"
else
  echo "Error: curl or wget is required to download the database."
  exit 1
fi

# Install node_modules for sqlite extension
cd "$INSTALL_DIR/extensions/sqlite"
if [ ! -d "node_modules" ]; then
  npm install --production 2>/dev/null || echo "Warning: npm install failed, you may need to run it manually"
fi
cd -

# Create wrapper script
cat > "$BIN_DIR/words" << 'EOF'
#!/bin/bash
cd "$HOME/.local/share/words"
./words "$@"
EOF
chmod +x "$BIN_DIR/words"

# Create .desktop file
cat > "$DESKTOP_DIR/words.desktop" << EOF
[Desktop Entry]
Name=Words Dictionary
Comment=Offline English Dictionary
Exec=$BIN_DIR/words
Icon=words
Terminal=false
Type=Application
Categories=Education;Dictionary;
Keywords=dictionary;words;english;definition;
EOF

# Copy icon
if [ -f "resources/assets/icons/icon.svg" ]; then
  cp "resources/assets/icons/icon.svg" "$ICON_DIR/words.svg"
fi

# Update desktop database
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo ""
echo "✓ Installation complete!"
echo ""
echo "You can now:"
echo "  1. Run 'words' from terminal"
echo "  2. Find 'Words Dictionary' in your application menu"
echo ""
echo "Install location: $INSTALL_DIR"

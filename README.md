# Words

A lightweight offline desktop dictionary built with [Neutralinojs](https://neutralino.js.org).

![App Size](https://img.shields.io/badge/size-~5MB-brightgreen)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue)

## Features

- **Offline dictionary** with 67MB English word database
- **Instant lookup** - type and press Enter
- **Text-to-speech** pronunciation
- **Search history** tracking
- **System tray** - minimizes to tray, runs in background
- **Online Dictionary & Wikipedia** integration

> **Note:** Installation requires an internet connection to download the 68MB dictionary database. Once installed, the primary dictionary works perfectly offline.

## Installation

```bash
git clone https://github.com/dotaziz/words.git
cd words

# Install SQLite extension dependencies
cd extensions/sqlite && npm install && cd ../..
```

## Usage

### Run the app
```bash
npm run dev
```

### Build for release
```bash
npm run build
```

## Hotkey Lookup (Linux)

For system-wide word lookup (like the original Electron version):

```bash
# Copy the helper script
cp scripts/words-lookup.sh ~/.local/bin/
chmod +x ~/.local/bin/words-lookup.sh

# Add keyboard shortcut in your desktop settings
# Bind Ctrl+Shift+W → ~/.local/bin/words-lookup.sh
```

**How it works:** Select text → Press hotkey → See definition in notification

**Requires:** `xclip`, `jq`, `notify-send`

## Project Structure

```
words/
├── resources/           # Frontend (HTML, CSS, JS)
├── extensions/sqlite/   # Database query script
├── database/            # Dictionary database (67MB)
├── bin/                 # Neutralino binaries
└── scripts/             # Helper scripts
```

## License

MIT

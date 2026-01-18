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

## Global Hotkey Lookup

Look up selected text from anywhere on your system with a keyboard shortcut:

### Setup (Linux)

1. **Copy the lookup script:**
   ```bash
   cp scripts/words-lookup.sh ~/.local/bin/
   chmod +x ~/.local/bin/words-lookup.sh
   ```

2. **Set up a keyboard shortcut:**
   - **GNOME:** Settings → Keyboard → Keyboard Shortcuts → Custom Shortcuts
   - **KDE:** System Settings → Shortcuts → Custom Shortcuts
   - **Command:** `~/.local/bin/words-lookup.sh`
   - **Recommended key:** Super+W or Alt+W

### Usage

1. Select any text in any application
2. Press your configured hotkey
3. The Words app opens automatically with the definition

**Dependencies:** `xclip` (required), `wmctrl` or `xdotool` (optional, for window focusing)

Install dependencies:
```bash
# Ubuntu/Debian
sudo apt install xclip wmctrl

# Arch Linux
sudo pacman -S xclip wmctrl

# Fedora
sudo dnf install xclip wmctrl
```

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

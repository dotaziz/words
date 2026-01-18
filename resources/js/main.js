/**
 * Words Dictionary - Neutralinojs
 * Enhanced with slide-out panels
 */

// DOM elements
const search = document.querySelector(".search-input");
const dropdown = document.querySelector(".dropdown");
const container = document.querySelector("div.container");
const menu = document.querySelector(".menu");
const historyBtn = document.querySelector(".history");
const exitBtn = document.getElementById("exit-btn");

// Side panel elements
const sidePanel = document.getElementById("side-panel");
const sidePanelTitle = document.getElementById("side-panel-title");
const sidePanelContent = document.getElementById("side-panel-content");
const sidePanelFooter = document.getElementById("side-panel-footer");
const sidePanelClose = document.querySelector(".side-panel-close");
const overlay = document.getElementById("overlay");
const recentSearchesEl = document.getElementById("recent-searches");

let currentWord = null;
let lastLookupWord = null;

// Initialize Neutralino
Neutralino.init();

// Database initialization
const DB_URL =
	"https://github.com/dotaziz/words/releases/download/words/dict_en_v2.db";
const DB_PATH = "database/dict_en_v2.db";

async function ensureDatabase() {
	try {
		// Get current working directory
		const result = await Neutralino.os.execCommand("pwd");
		const cwd = result.stdOut.trim();
		const dbFullPath = `${cwd}/${DB_PATH}`;

		// Check if database exists
		const checkCmd = await Neutralino.os.execCommand(
			`test -f "${dbFullPath}" && echo "exists" || echo "missing"`,
		);
		const dbExists = checkCmd.stdOut.trim() === "exists";

		if (!dbExists) {
			console.log("Database not found. Downloading...");

			// Show loading message with progress
			const messageEl = document.querySelector(".message");
			const messageText = document.querySelector(".message > div");
			if (messageEl && messageText) {
				messageEl.style.display = "flex";
				messageText.innerHTML = `
					Downloading dictionary database (68MB)...<br>
					<span id="download-progress" style="font-size: 0.9em; color: #007bff;">0%</span>
				`;
			}

			// Create database directory if it doesn't exist
			await Neutralino.filesystem
				.createDirectory(`${cwd}/database`)
				.catch(() => {});

			try {
				// Use curl for download (fetch blocked by CORS on GitHub redirects)
				const progressFile = `${cwd}/.download-progress`;
				const downloadCmd = `curl -L "${DB_URL}" -o "${dbFullPath}" --progress-bar 2>&1 | stdbuf -oL tr '\\r' '\\n' | while read line; do echo "$line" | grep -oE '[0-9]+\\.[0-9]' | tail -1 > "${progressFile}"; done`;

				// Start download in background
				Neutralino.os.execCommand(`${downloadCmd} &`);

				// Monitor progress
				const checkProgress = async () => {
					const progressCmd = await Neutralino.os.execCommand(
						`cat "${progressFile}" 2>/dev/null || echo "0"`,
					);
					const progress = parseFloat(progressCmd.stdOut.trim()) || 0;
					const progressEl = document.getElementById("download-progress");
					if (progressEl) {
						progressEl.textContent = `${Math.round(progress)}%`;
					}

					// Check if file exists and is complete (~68MB)
					const checkSize = await Neutralino.os.execCommand(
						`stat -c%s "${dbFullPath}" 2>/dev/null || echo "0"`,
					);
					const fileSize = parseInt(checkSize.stdOut.trim()) || 0;

					if (fileSize > 70000000) {
						await Neutralino.os.execCommand(`rm -f "${progressFile}"`);
						console.log("✓ Database downloaded successfully");
						showToast("Database ready!");
						if (messageText) {
							messageText.textContent =
								"Look up definitions of any english term.";
						}
						return;
					}

					// Keep checking
					setTimeout(checkProgress, 500);
				};

				// Start progress monitoring
				setTimeout(checkProgress, 500);

				// Timeout after 5 minutes
				setTimeout(async () => {
					const checkSize = await Neutralino.os.execCommand(
						`stat -c%s "${dbFullPath}" 2>/dev/null || echo "0"`,
					);
					const fileSize = parseInt(checkSize.stdOut.trim()) || 0;
					if (fileSize < 70000000) {
						console.error("✗ Database download timeout");
						if (messageText) {
							messageText.textContent =
								"Download timeout. Please check your internet and restart.";
						}
						showToast("Download timeout.");
					}
				}, 300000);
			} catch (err) {
				console.error("✗ Database download error:", err);
				if (messageText) {
					messageText.textContent = `Download failed: ${err.message}. Please check your internet connection and restart the app.`;
				}
				showToast("Download failed.");
			}
		} else {
			console.log("✓ Database found at:", dbFullPath);
		}
	} catch (err) {
		console.error("✗ Database initialization error:", err);
		showToast("Error initializing database: " + err.message);
	}
}

// Set window icon
async function setWindowIcon() {
	try {
		const config = await Neutralino.app.getConfig();
		const resourcesPath = config.cli?.resourcesPath || "/resources/";
		const result = await Neutralino.os.execCommand("pwd");
		const cwd = result.stdOut.trim();
		const iconPath = `${cwd}${resourcesPath}icon.png`;

		await Neutralino.window.setIcon(iconPath);
		console.log("✓ Window icon set to:", iconPath);
	} catch (err) {
		console.error("✗ Window icon error:", err);
	}
}
setWindowIcon();

// Detect package manager
async function detectPackageManager() {
	const managers = [
		{
			cmd: "pacman --version",
			install: "pkexec pacman -S --noconfirm",
			name: "pacman",
		},
		{ cmd: "apt --version", install: "pkexec apt-get install -y", name: "apt" },
		{ cmd: "dnf --version", install: "pkexec dnf install -y", name: "dnf" },
		{
			cmd: "zypper --version",
			install: "pkexec zypper install -y",
			name: "zypper",
		},
	];

	for (const pm of managers) {
		try {
			const check = await Neutralino.os.execCommand(`${pm.cmd} 2>/dev/null`);
			if (check.exitCode === 0) {
				return pm;
			}
		} catch {}
	}
	return null;
}

// Package names per package manager
const PACKAGE_NAMES = {
	pacman: {
		tray: "libayatana-appindicator",
		xclip: "xclip",
		xdotool: "xdotool",
		notify: "libnotify",
	},
	apt: {
		tray: "libayatana-appindicator3-1",
		xclip: "xclip",
		xdotool: "xdotool",
		notify: "libnotify-bin",
	},
	dnf: {
		tray: "libayatana-appindicator-gtk3",
		xclip: "xclip",
		xdotool: "xdotool",
		notify: "libnotify",
	},
	zypper: {
		tray: "libayatana-appindicator3-1",
		xclip: "xclip",
		xdotool: "xdotool",
		notify: "libnotify-tools",
	},
};

// Check and install Linux dependencies
async function ensureLinuxDependencies() {
	try {
		const osInfo = await Neutralino.computer.getOSInfo();
		if (osInfo.name !== "Linux") {
			return { tray: true, lookup: true };
		}

		const pm = await detectPackageManager();
		if (!pm) {
			console.warn("⚠ Could not detect package manager");
			return { tray: false, lookup: false };
		}

		const pkgNames = PACKAGE_NAMES[pm.name];
		const missing = [];

		// Check tray dependency
		const checkTray = await Neutralino.os.execCommand(
			'ldconfig -p | grep libayatana-appindicator3 || echo "missing"',
		);
		const trayInstalled = checkTray.stdOut.includes("libayatana-appindicator3");
		if (!trayInstalled) missing.push(pkgNames.tray);

		// Check xclip
		const checkXclip = await Neutralino.os.execCommand(
			'command -v xclip || echo "missing"',
		);
		const xclipInstalled = !checkXclip.stdOut.includes("missing");
		if (!xclipInstalled) missing.push(pkgNames.xclip);

		// Check xdotool
		const checkXdotool = await Neutralino.os.execCommand(
			'command -v xdotool || echo "missing"',
		);
		const xdotoolInstalled = !checkXdotool.stdOut.includes("missing");
		if (!xdotoolInstalled) missing.push(pkgNames.xdotool);

		// Check notify-send
		const checkNotify = await Neutralino.os.execCommand(
			'command -v notify-send || echo "missing"',
		);
		const notifyInstalled = !checkNotify.stdOut.includes("missing");
		if (!notifyInstalled) missing.push(pkgNames.notify);

		if (missing.length === 0) {
			console.log("✓ All Linux dependencies installed");
			return { tray: true, lookup: true };
		}

		console.log("⚠ Missing dependencies:", missing.join(", "));
		showToast(`Installing dependencies: ${missing.join(", ")}...`);

		const installCmd = `${pm.install} ${missing.join(" ")} 2>&1 || echo "INSTALL_FAILED"`;
		const result = await Neutralino.os.execCommand(installCmd);

		if (result.stdOut.includes("INSTALL_FAILED")) {
			console.warn("⚠ Could not auto-install dependencies");
			showToast(`Please install manually: ${missing.join(" ")}`);
			return { tray: trayInstalled, lookup: xclipInstalled };
		}

		console.log("✓ Dependencies installed successfully");
		showToast("Dependencies installed!");
		return { tray: true, lookup: true };
	} catch (err) {
		console.warn("⚠ Error checking dependencies:", err);
		return { tray: false, lookup: false };
	}
}

// Legacy function for backward compatibility
async function ensureTrayDependencies() {
	const result = await ensureLinuxDependencies();
	return result.tray;
}

// Setup system tray
async function setupTray() {
	try {
		// Ensure dependencies are installed (Linux only)
		const depsReady = await ensureTrayDependencies();
		if (!depsReady) {
			console.log("ℹ Tray dependencies not available. Tray icon disabled.");
			return;
		}

		const config = await Neutralino.app.getConfig();
		const resourcesPath = config.cli?.resourcesPath || "/resources/";
		const result = await Neutralino.os.execCommand("pwd");
		const cwd = result.stdOut.trim();
		const iconPath = `${cwd}${resourcesPath}icon.png`;

		await Neutralino.os.setTray({
			icon: iconPath,
			menuItems: [
				{ id: "show", text: "Show Words" },
				{ id: "lookup", text: "Lookup Selection" },
				{ id: "random", text: "Random Word" },
				{ text: "-" },
				{ id: "quit", text: "Quit" },
			],
		});
		console.log("✓ Tray icon set successfully");
	} catch (err) {
		console.warn("⚠ Tray initialization failed:", err.message);
		console.log(
			"ℹ The app will continue without a tray icon. This is normal on some systems.",
		);
		// Don't throw - app can work without tray icon
	}
}
setupTray();

// Tray events
Neutralino.events.on("trayMenuItemClicked", async (evt) => {
	switch (evt.detail.id) {
		case "show":
			await Neutralino.window.show();
			await Neutralino.window.focus();
			// If there's a recent lookup word, search for it
			if (lastLookupWord) {
				search.value = lastLookupWord;
				performSearch();
				lastLookupWord = null;
			}
			break;
		case "lookup":
			// Get selected text via xclip
			try {
				const clipResult = await Neutralino.os.execCommand(
					'xclip -o -selection primary 2>/dev/null || xclip -o -selection clipboard 2>/dev/null || echo ""',
				);
				const selectedText = clipResult.stdOut.trim();

				if (selectedText && selectedText.length <= 50) {
					// Query the definition
					const result = await queryWord(selectedText);
					let definition = "No definition found. Click to search online.";

					if (result && result.definitions && result.definitions.length > 0) {
						// Get first definition, truncate if too long
						definition = result.definitions[0].definition;
						if (definition.length > 200) {
							definition = definition.substring(0, 197) + "...";
						}
					}

					// Escape special characters for shell
					const safeWord = selectedText.replace(/"/g, '\\"');
					const safeDef = definition.replace(/"/g, '\\"').replace(/`/g, "\\`");

					// Store word for opening app
					lastLookupWord = selectedText;

					// Show notification with definition
					await Neutralino.os.execCommand(
						`notify-send -t 8000 "Words: ${safeWord}" "${safeDef}"`,
					);
				} else if (selectedText.length > 50) {
					await Neutralino.os.execCommand(
						'notify-send -t 2000 "Words Dictionary" "Selected text too long (max 50 chars)"',
					);
				} else {
					await Neutralino.os.execCommand(
						'notify-send -t 2000 "Words Dictionary" "No text selected"',
					);
				}
			} catch (err) {
				console.error("Lookup error:", err);
			}
			break;
		case "random":
			await Neutralino.window.show();
			await Neutralino.window.focus();
			randomWord();
			break;
		case "quit":
			Neutralino.app.exit();
			break;
	}
});

// Window close - hide to tray
Neutralino.events.on("windowClose", async () => {
	try {
		await Neutralino.window.hide();
	} catch {
		Neutralino.app.exit();
	}
});

// ========== Storage ==========

async function getStorage(key, defaultVal = []) {
	try {
		const data = await Neutralino.storage.getData(key);
		return JSON.parse(data);
	} catch {
		return defaultVal;
	}
}

async function setStorage(key, value) {
	await Neutralino.storage.setData(key, JSON.stringify(value));
}

// ========== Settings ==========

const DEFAULT_HOTKEYS = {
	history: "h",
	bookmarks: "b",
	random: "r",
	darkmode: "d",
	stats: "s",
	quit: "q",
};

async function getSettings() {
	return await getStorage("settings", {
		darkMode: false,
		hotkeys: DEFAULT_HOTKEYS,
	});
}

async function getHotkeys() {
	const settings = await getSettings();
	return settings.hotkeys || DEFAULT_HOTKEYS;
}

async function saveHotkey(action, key) {
	const settings = await getSettings();
	if (!settings.hotkeys) settings.hotkeys = { ...DEFAULT_HOTKEYS };
	settings.hotkeys[action] = key.toLowerCase();
	await setStorage("settings", settings);
	showToast(`Hotkey for ${action} set to Ctrl+${key.toUpperCase()}`);
}

async function applySettings() {
	const settings = await getSettings();
	document.body.classList.toggle("dark-mode", settings.darkMode);
}
applySettings();

// ========== Statistics ==========

async function getStats() {
	return await getStorage("stats", { totalSearches: 0, uniqueWords: [] });
}

async function trackSearch(word) {
	const stats = await getStats();
	stats.totalSearches++;
	if (!stats.uniqueWords.includes(word)) {
		stats.uniqueWords.push(word);
	}
	await setStorage("stats", stats);
}

// ========== History ==========

async function getHistory() {
	return await getStorage("history");
}

async function saveToHistory(word) {
	const history = await getHistory();
	const filtered = history.filter((h) => h.word !== word);
	filtered.push({ word, time: new Date().toISOString() });
	await setStorage("history", filtered.slice(-100));
	await trackSearch(word);
	updateRecentSearches();
}

async function clearHistory() {
	await setStorage("history", []);
	showToast("History cleared");
	showHistory();
}

async function removeFromHistory(word) {
	const history = await getHistory();
	await setStorage(
		"history",
		history.filter((h) => h.word !== word),
	);
	showHistory();
}

// ========== Bookmarks ==========

async function getBookmarks() {
	return await getStorage("bookmarks");
}

async function isBookmarked(word) {
	const bookmarks = await getBookmarks();
	return bookmarks.some((b) => b.word === word);
}

async function toggleBookmark(word) {
	const bookmarks = await getBookmarks();
	const index = bookmarks.findIndex((b) => b.word === word);
	const wasBookmarked = index > -1;

	if (wasBookmarked) {
		bookmarks.splice(index, 1);
	} else {
		bookmarks.push({ word, time: new Date().toISOString() });
	}

	await setStorage("bookmarks", bookmarks);
	updateBookmarkBtn(word);
	showToast(wasBookmarked ? "Removed from bookmarks" : "Added to bookmarks");
}

async function removeBookmark(word) {
	const bookmarks = await getBookmarks();
	await setStorage(
		"bookmarks",
		bookmarks.filter((b) => b.word !== word),
	);
	showBookmarks();
}

function updateBookmarkBtn(word) {
	const btn = document.querySelector(".bookmark-word-btn");
	if (!btn) return;
	isBookmarked(word).then((bookmarked) => {
		btn.classList.toggle("bookmarked", bookmarked);
		btn.textContent = bookmarked ? "★ Bookmarked" : "☆ Bookmark";
	});
}

// ========== Database Query ==========

async function queryWord(word) {
	try {
		const cmd = `node extensions/sqlite/query.js "${word.trim().toLowerCase().replace(/"/g, '\\"')}"`;
		const result = await Neutralino.os.execCommand(cmd);
		if (result.stdOut) {
			return JSON.parse(result.stdOut.trim());
		}
		return null;
	} catch (err) {
		console.error("Query error:", err);
		return null;
	}
}

async function getRandomWord() {
	try {
		const cmd = `node extensions/sqlite/random.js`;
		const result = await Neutralino.os.execCommand(cmd);
		if (result.stdOut) {
			return JSON.parse(result.stdOut.trim());
		}
		return null;
	} catch {
		return null;
	}
}

// ========== Wikipedia Query ==========

async function queryWikipedia(query) {
	try {
		const encodedQuery = encodeURIComponent(query.trim());
		const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;

		const response = await fetch(url);
		if (!response.ok) {
			return null;
		}

		const data = await response.json();

		if (data.type === "disambiguation") {
			// It's a disambiguation page
			return {
				title: data.title,
				extract: data.extract,
				extract_html: data.extract_html,
				description: data.description,
				thumbnail: data.thumbnail?.source,
				isDisambiguation: true,
				url: data.content_urls?.desktop?.page,
				wikibase_item: data.wikibase_item,
				coordinates: data.coordinates,
			};
		}

		if (data.type === "standard" || data.extract) {
			return {
				title: data.title,
				displaytitle: data.displaytitle,
				extract: data.extract,
				extract_html: data.extract_html,
				description: data.description,
				thumbnail: data.thumbnail?.source,
				originalimage: data.originalimage?.source,
				lang: data.lang,
				dir: data.dir,
				timestamp: data.timestamp,
				url: data.content_urls?.desktop?.page,
				isDisambiguation: false,
				wikibase_item: data.wikibase_item,
				coordinates: data.coordinates,
			};
		}

		return null;
	} catch (err) {
		console.error("Wikipedia error:", err);
		return null;
	}
}

// ========== Toast ==========

function showToast(message) {
	let toast = document.querySelector(".toast");
	if (!toast) {
		toast = document.createElement("div");
		toast.className = "toast";
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	toast.classList.add("show");
	setTimeout(() => toast.classList.remove("show"), 2000);
}

// ========== Copy ==========

function copyDefinition() {
	const dictEl = document.querySelector(".dictionary");
	if (dictEl) {
		navigator.clipboard.writeText(dictEl.innerText).then(() => {
			showToast("Copied to clipboard");
		});
	}
}

function copyScriptPath() {
	const scriptPath = "~/.local/bin/words-lookup.sh";
	navigator.clipboard.writeText(scriptPath).then(() => {
		showToast("Script path copied!");
	});
}

// ========== Random Word ==========

async function randomWord() {
	const data = await getRandomWord();
	if (data && data.word) {
		search.value = data.word;
		performSearch();
	} else {
		showToast("Could not get random word");
	}
}

// ========== Recent Searches ==========

async function updateRecentSearches() {
	// Check if DOM element exists
	if (!recentSearchesEl) {
		console.warn("Recent searches element not found in DOM");
		return;
	}

	const history = await getHistory();
	const recent = history.slice(-5).reverse();

	if (recent.length === 0) {
		recentSearchesEl.innerHTML = "";
		return;
	}

	recentSearchesEl.innerHTML = recent
		.map(
			(h) => `<span class="recent-chip" data-word="${h.word}">${h.word}</span>`,
		)
		.join("");

	recentSearchesEl.querySelectorAll(".recent-chip").forEach((chip) => {
		chip.addEventListener("click", () => {
			search.value = chip.dataset.word;
			performSearch();
		});
	});
}

// ========== Side Panel ==========

function openPanel(title) {
	sidePanelTitle.textContent = title;
	sidePanel.classList.add("active");
	overlay.classList.add("active");
}

function closePanel() {
	sidePanel.classList.remove("active");
	overlay.classList.remove("active");
}

async function showHistory() {
	openPanel("History");
	const history = await getHistory();

	if (history.length === 0) {
		sidePanelContent.innerHTML =
			'<div class="panel-empty">No history yet</div>';
		sidePanelFooter.innerHTML = "";
		return;
	}

	let html = '<ul class="panel-list">';
	for (const item of history.slice().reverse()) {
		const date = new Date(item.time).toLocaleDateString();
		html += `
      <li class="panel-item" data-word="${item.word}">
        <span class="panel-item-text">${item.word}</span>
        <span class="panel-item-time">${date}</span>
        <button class="panel-item-delete" data-word="${item.word}">&times;</button>
      </li>
    `;
	}
	html += "</ul>";
	sidePanelContent.innerHTML = html;

	sidePanelFooter.innerHTML =
		'<button class="clear-btn">Clear All History</button>';
	sidePanelFooter
		.querySelector(".clear-btn")
		.addEventListener("click", clearHistory);

	// Item clicks
	sidePanelContent.querySelectorAll(".panel-item").forEach((item) => {
		item.addEventListener("click", (e) => {
			if (e.target.classList.contains("panel-item-delete")) return;
			search.value = item.dataset.word;
			closePanel();
			performSearch();
		});
	});

	// Delete clicks
	sidePanelContent.querySelectorAll(".panel-item-delete").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			removeFromHistory(btn.dataset.word);
		});
	});
}

async function showBookmarks() {
	openPanel("Bookmarks");
	const bookmarks = await getBookmarks();

	if (bookmarks.length === 0) {
		sidePanelContent.innerHTML =
			'<div class="panel-empty">No bookmarks yet</div>';
		sidePanelFooter.innerHTML = "";
		return;
	}

	let html = '<ul class="panel-list">';
	for (const item of bookmarks.slice().reverse()) {
		html += `
      <li class="panel-item" data-word="${item.word}">
        <span class="panel-item-text">${item.word}</span>
        <button class="panel-item-delete" data-word="${item.word}">&times;</button>
      </li>
    `;
	}
	html += "</ul>";
	sidePanelContent.innerHTML = html;
	sidePanelFooter.innerHTML = "";

	// Item clicks
	sidePanelContent.querySelectorAll(".panel-item").forEach((item) => {
		item.addEventListener("click", (e) => {
			if (e.target.classList.contains("panel-item-delete")) return;
			search.value = item.dataset.word;
			closePanel();
			performSearch();
		});
	});

	// Delete clicks
	sidePanelContent.querySelectorAll(".panel-item-delete").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			removeBookmark(btn.dataset.word);
		});
	});
}

async function showStats() {
	openPanel("Statistics");
	const stats = await getStats();
	const bookmarks = await getBookmarks();

	sidePanelContent.innerHTML = `
    <div style="padding: 20px;">
      <p><strong>Total Searches:</strong> ${stats.totalSearches}</p>
      <p><strong>Unique Words:</strong> ${stats.uniqueWords.length}</p>
      <p><strong>Bookmarks:</strong> ${bookmarks.length}</p>
    </div>
  `;
	sidePanelFooter.innerHTML = "";
}

function showAbout() {
	openPanel("About");
	sidePanelContent.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h2 style="margin: 0 0 10px;">Words Dictionary</h2>
      <p style="color: #007bff; margin: 0 0 15px;">Version 1.0.0</p>
      <p>A lightweight offline dictionary built with Neutralinojs.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">By Abdul Aziz Ali</p>
    </div>
  `;
	sidePanelFooter.innerHTML =
		'<button class="clear-btn" onclick="showSettings()">Customize Hotkeys</button>';
}

async function showSettings() {
	openPanel("Settings");
	const hotkeys = await getHotkeys();

	const hotkeyLabels = {
		history: "History",
		bookmarks: "Bookmarks",
		random: "Random Word",
		darkmode: "Dark Mode",
		stats: "Statistics",
		quit: "Quit App",
	};

	let html = '<div class="settings-panel">';
	html += '<h4 class="settings-section-title">In-App Shortcuts</h4>';
	html +=
		'<p class="settings-hint">Click a key and press a new letter to change.</p>';

	for (const [action, label] of Object.entries(hotkeyLabels)) {
		const key = hotkeys[action] || DEFAULT_HOTKEYS[action];
		html += `
      <div class="hotkey-row">
        <span class="hotkey-label">${label}</span>
        <span class="hotkey-combo">
          <span class="hotkey-mod">Ctrl +</span>
          <input type="text"
                 class="hotkey-input"
                 data-action="${action}"
                 value="${key.toUpperCase()}"
                 maxlength="1"
                 readonly>
        </span>
      </div>
    `;
	}

	html +=
		'<button class="reset-hotkeys-btn" onclick="resetHotkeys()">Reset to Defaults</button>';

	// Global hotkey section
	html +=
		'<h4 class="settings-section-title" style="margin-top:25px;">Global Lookup Hotkey</h4>';
	html +=
		'<p class="settings-hint">Look up selected text from any app (system-wide).</p>';
	html += `
    <div class="global-hotkey-info">
      <p><strong>Default:</strong> <code>Ctrl+Alt+W</code></p>
      <p class="small-text">Set up in your system's keyboard settings:</p>
      <ol class="setup-steps">
        <li>Open keyboard shortcuts (Settings → Keyboard)</li>
        <li>Add custom shortcut</li>
        <li>Command: <code>~/.local/bin/words-lookup.sh</code></li>
        <li>Set shortcut to <strong>Ctrl+Alt+W</strong></li>
      </ol>
      <button class="copy-path-btn" onclick="copyScriptPath()">Copy Script Path</button>
    </div>
  `;

	html += "</div>";

	sidePanelContent.innerHTML = html;
	sidePanelFooter.innerHTML = "";

	// Add click handlers for hotkey inputs
	sidePanelContent.querySelectorAll(".hotkey-input").forEach((input) => {
		input.addEventListener("click", function () {
			this.classList.add("listening");
			this.value = "...";
		});

		input.addEventListener("keydown", async function (e) {
			e.preventDefault();
			if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
				const action = this.dataset.action;
				await saveHotkey(action, e.key);
				this.value = e.key.toUpperCase();
				this.classList.remove("listening");
				updateMenuShortcuts();
			}
		});

		input.addEventListener("blur", async function () {
			const hotkeys = await getHotkeys();
			this.value = (
				hotkeys[this.dataset.action] || DEFAULT_HOTKEYS[this.dataset.action]
			).toUpperCase();
			this.classList.remove("listening");
		});
	});
}

async function resetHotkeys() {
	const settings = await getSettings();
	settings.hotkeys = { ...DEFAULT_HOTKEYS };
	await setStorage("settings", settings);
	showToast("Hotkeys reset to defaults");
	showSettings();
	updateMenuShortcuts();
}

async function updateMenuShortcuts() {
	const hotkeys = await getHotkeys();
	const items = menu.querySelectorAll(".menu-item");
	items.forEach((item) => {
		const action = item.dataset.action;
		if (action && hotkeys[action]) {
			const shortcut = item.querySelector(".menu-shortcut");
			if (shortcut) {
				shortcut.textContent = `Ctrl+${hotkeys[action].toUpperCase()}`;
			}
		}
	});
}

async function toggleDarkMode() {
	const settings = await getSettings();
	settings.darkMode = !settings.darkMode;
	await setStorage("settings", settings);
	document.body.classList.toggle("dark-mode", settings.darkMode);
	showToast(settings.darkMode ? "Dark mode on" : "Dark mode off");
}

// ========== Dictionary Display ==========

function dictionary(data) {
	const dictSection = document.createElement("div");
	dictSection.classList.add("dictionary");

	// Word header
	const header = document.createElement("div");
	header.className = "word-header";

	const title = document.createElement("h2");
	title.className = "word-title-display";
	title.textContent = data.word;
	header.appendChild(title);

	const actions = document.createElement("div");
	actions.className = "word-actions";

	const bookmarkBtn = document.createElement("button");
	bookmarkBtn.className = "bookmark-word-btn";
	bookmarkBtn.textContent = "☆ Bookmark";
	bookmarkBtn.addEventListener("click", () => toggleBookmark(data.word));
	actions.appendChild(bookmarkBtn);

	const copyBtn = document.createElement("button");
	copyBtn.className = "copy-btn";
	copyBtn.textContent = "📋 Copy";
	copyBtn.addEventListener("click", copyDefinition);
	actions.appendChild(copyBtn);

	header.appendChild(actions);
	dictSection.appendChild(header);

	// Phonetics
	if (data.phonetics && data.phonetics.length) {
		data.phonetics.forEach((i) => {
			if (!i.text) return;
			const pronunciation = document.createElement("div");
			pronunciation.classList.add("pronunciation");

			const phonetic = document.createElement("span");
			phonetic.textContent = i.text;
			pronunciation.appendChild(phonetic);

			const btn = document.createElement("button");
			btn.className = "speak-btn";
			btn.addEventListener("click", () => {
				if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
					const utter = new window.SpeechSynthesisUtterance(data.word);
					utter.lang = "en-US";
					window.speechSynthesis.speak(utter);
				} else {
					showToast("Text-to-speech not available");
				}
			});
			btn.title = "Listen";

			const img = document.createElement("img");
			img.alt = "sound";
			img.src = "assets/icons/volume.svg";
			img.draggable = false;
			btn.appendChild(img);
			pronunciation.appendChild(btn);
			dictSection.appendChild(pronunciation);
		});
	}

	// Meanings
	for (const meaning of data.meanings) {
		const section = document.createElement("div");
		section.className = "meaning-section";

		const pos = document.createElement("span");
		pos.classList.add("part-of-speech");
		pos.textContent = meaning.partOfSpeech;
		section.appendChild(pos);

		const ol = document.createElement("ol");
		meaning.definitions.forEach((def) => {
			const li = document.createElement("li");

			const p = document.createElement("p");
			p.className = "definition-text";
			p.textContent = def.definition;
			li.appendChild(p);

			if (def.example) {
				const example = document.createElement("div");
				example.className = "example";
				example.innerHTML = `"${def.example.replace(
					new RegExp(data.word, "gi"),
					`<strong>${data.word}</strong>`,
				)}"`;
				li.appendChild(example);
			}

			if (def.synonyms && def.synonyms.length) {
				const synDiv = document.createElement("div");
				synDiv.classList.add("synonyms");
				synDiv.innerHTML = '<span class="syn-label">Synonyms:</span> ';
				def.synonyms.slice(0, 5).forEach((syn, i) => {
					const a = document.createElement("a");
					a.textContent = syn;
					a.addEventListener("click", (e) => {
						e.preventDefault();
						search.value = syn;
						performSearch();
					});
					synDiv.appendChild(a);
					if (i < Math.min(def.synonyms.length, 5) - 1) {
						synDiv.appendChild(document.createTextNode(", "));
					}
				});
				li.appendChild(synDiv);
			}

			if (def.antonyms && def.antonyms.length) {
				const antDiv = document.createElement("div");
				antDiv.classList.add("antonyms");
				antDiv.innerHTML = '<span class="ant-label">Antonyms:</span> ';
				def.antonyms.slice(0, 5).forEach((ant, i) => {
					const a = document.createElement("a");
					a.textContent = ant;
					a.addEventListener("click", (e) => {
						e.preventDefault();
						search.value = ant;
						performSearch();
					});
					antDiv.appendChild(a);
					if (i < Math.min(def.antonyms.length, 5) - 1) {
						antDiv.appendChild(document.createTextNode(", "));
					}
				});
				li.appendChild(antDiv);
			}

			ol.appendChild(li);
		});
		section.appendChild(ol);
		dictSection.appendChild(section);
	}

	setTimeout(() => updateBookmarkBtn(data.word), 0);
	return dictSection;
}

// Wikipedia result display
function wikipediaResult(data) {
	const section = document.createElement("div");
	section.className = "wikipedia-result";

	// Source badge
	const badge = document.createElement("div");
	badge.className = "source-badge wikipedia";
	badge.textContent = "Wikipedia";
	section.appendChild(badge);

	// Title
	const title = document.createElement("h2");
	title.className = "wiki-title";
	title.textContent = data.title;
	section.appendChild(title);

	// Description (subtitle)
	if (data.description) {
		const desc = document.createElement("p");
		desc.className = "wiki-description";
		desc.textContent = data.description;
		section.appendChild(desc);
	}

	// Thumbnail or Original Image
	if (data.originalimage || data.thumbnail) {
		const img = document.createElement("img");
		img.className = "wiki-thumbnail";
		img.src = data.originalimage || data.thumbnail;
		img.alt = data.title;
		img.loading = "lazy";
		section.appendChild(img);
	}

	// Extract (use HTML version if available for better formatting)
	if (data.extract_html) {
		const extractDiv = document.createElement("div");
		extractDiv.className = "wiki-extract";
		extractDiv.innerHTML = data.extract_html;
		section.appendChild(extractDiv);
	} else if (data.extract) {
		const extract = document.createElement("p");
		extract.className = "wiki-extract";
		extract.textContent = data.extract;
		section.appendChild(extract);
	}

	// Coordinates (if available)
	if (data.coordinates) {
		const coordDiv = document.createElement("div");
		coordDiv.className = "wiki-coordinates";
		coordDiv.innerHTML = `
			<strong>📍 Coordinates:</strong>
			<a href="https://www.google.com/maps?q=${data.coordinates.lat},${data.coordinates.lon}"
			   target="_blank"
			   style="color: #007bff; text-decoration: none;">
				${data.coordinates.lat.toFixed(4)}°, ${data.coordinates.lon.toFixed(4)}°
			</a>
		`;
		section.appendChild(coordDiv);
	}

	// Disambiguation notice
	if (data.isDisambiguation) {
		const notice = document.createElement("p");
		notice.className = "wiki-disambig";
		notice.textContent = "⚠️ This term may refer to multiple topics.";
		section.appendChild(notice);
	}

	// Metadata (timestamp, language)
	if (data.timestamp || data.lang) {
		const metaDiv = document.createElement("div");
		metaDiv.className = "wiki-metadata";
		metaDiv.style.fontSize = "0.85em";
		metaDiv.style.color = "#666";
		metaDiv.style.marginTop = "10px";

		const metaParts = [];
		if (data.timestamp) {
			const date = new Date(data.timestamp);
			metaParts.push(`Last updated: ${date.toLocaleDateString()}`);
		}
		if (data.lang && data.lang !== "en") {
			metaParts.push(`Language: ${data.lang}`);
		}

		if (metaParts.length > 0) {
			metaDiv.textContent = metaParts.join(" • ");
			section.appendChild(metaDiv);
		}
	}

	// Read more link
	if (data.url) {
		const link = document.createElement("a");
		link.className = "wiki-link";
		link.href = data.url;
		link.textContent = "Read full article on Wikipedia →";
		link.target = "_blank";
		link.addEventListener("click", async (e) => {
			e.preventDefault();
			try {
				await Neutralino.os.open(data.url);
			} catch {
				window.open(data.url, "_blank");
			}
		});
		section.appendChild(link);
	}

	return section;
}

// ========== Source Tabs ==========

let currentSource = "all";

document.querySelectorAll(".source-tab").forEach((tab) => {
	tab.addEventListener("click", () => {
		// Update UI
		document
			.querySelectorAll(".source-tab")
			.forEach((t) => t.classList.remove("active"));
		tab.classList.add("active");

		// Update state
		currentSource = tab.dataset.source;

		// Rerun search if there's a query
		if (search.value.trim()) {
			performSearch();
		}
	});
});

// ========== Online Dictionary Query (Free Dictionary API) ==========

async function queryOnlineDictionary(query) {
	try {
		const encodedQuery = encodeURIComponent(query.trim());
		const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodedQuery}`;

		const response = await fetch(url);
		if (!response.ok) return null;

		const data = await response.json();
		return Array.isArray(data) ? data[0] : null; // Use first result
	} catch (err) {
		console.error("Online Dictionary error:", err);
		return null;
	}
}

function onlineDictionaryResult(data) {
	const section = document.createElement("div");
	section.className = "dictionary-result online";

	// Badge
	const badge = document.createElement("div");
	badge.className = "source-badge online";
	badge.textContent = "Online Dictionary";
	section.appendChild(badge);

	// We can reuse the existing dictionary renderer logic but wrapped
	// Or create a simplified renderer since the API structure is slightly different
	// actually api.dictionaryapi.dev structure is very similar to what we use

	// Title
	const header = document.createElement("div");
	header.className = "word-header";

	const titleGroup = document.createElement("div");
	const h1 = document.createElement("h1");
	h1.className = "word-title-display";
	h1.textContent = data.word;
	titleGroup.appendChild(h1);

	// Phonetic
	if (data.phonetic || (data.phonetics && data.phonetics.length)) {
		const phoneticText =
			data.phonetic || data.phonetics.find((p) => p.text)?.text;
		if (phoneticText) {
			const p = document.createElement("span");
			p.className = "pronunciation";
			p.textContent = phoneticText;
			titleGroup.appendChild(p);
		}
	}
	header.appendChild(titleGroup);
	section.appendChild(header);

	// Meanings
	const dictSection = document.createElement("div");
	dictSection.className = "dictionary";

	data.meanings.forEach((meaning) => {
		const meanSection = document.createElement("div");
		meanSection.className = "meaning-section";

		const pos = document.createElement("span");
		pos.className = "part-of-speech";
		pos.textContent = meaning.partOfSpeech;
		meanSection.appendChild(pos);

		const ol = document.createElement("ol");
		meaning.definitions.forEach((def) => {
			const li = document.createElement("li");

			const defText = document.createElement("div");
			defText.className = "definition-text";
			defText.textContent = def.definition;
			li.appendChild(defText);

			if (def.example) {
				const ex = document.createElement("div");
				ex.className = "example";
				ex.textContent = `"${def.example}"`;
				li.appendChild(ex);
			}

			ol.appendChild(li);
		});
		meanSection.appendChild(ol);
		dictSection.appendChild(meanSection);
	});

	section.appendChild(dictSection);
	return section;
}

// ========== Search ==========

async function performSearch() {
	const word = search.value.trim();
	if (!word) return;

	// Reset UI
	container.innerHTML = "";
	document.querySelector(".message").style.display = "none";

	// Create placeholders for order: Offline -> Online -> Wikipedia
	const offlinePlaceholder = document.createElement("div");
	offlinePlaceholder.id = "result-offline";
	container.appendChild(offlinePlaceholder);

	const onlinePlaceholder = document.createElement("div");
	onlinePlaceholder.id = "result-online";
	container.appendChild(onlinePlaceholder);

	const wikiPlaceholder = document.createElement("div");
	wikiPlaceholder.id = "result-wiki";
	container.appendChild(wikiPlaceholder);

	let hasResults = false;
	const loadingIndicator = document.createElement("div");
	loadingIndicator.className = "loading";
	loadingIndicator.textContent = "Searching...";
	container.appendChild(loadingIndicator); // Append at end

	await saveToHistory(word);

	// Parallel Execution
	const tasks = [];

	// 1. Offline Dictionary
	if (currentSource === "all" || currentSource === "dictionary") {
		tasks.push(
			queryWord(word).then((resp) => {
				if (resp && resp.word) {
					hasResults = true;
					offlinePlaceholder.innerHTML = ""; // Clear potentially previous content
					offlinePlaceholder.appendChild(dictionary(resp));
				}
			}),
		);
	}

	// 2. Online Dictionary
	if (currentSource === "all" || currentSource === "online") {
		tasks.push(
			queryOnlineDictionary(word).then((resp) => {
				if (resp) {
					hasResults = true;
					onlinePlaceholder.appendChild(onlineDictionaryResult(resp));
				}
			}),
		);
	}

	// 3. Wikipedia
	if (currentSource === "all" || currentSource === "wikipedia") {
		tasks.push(
			queryWikipedia(word).then((resp) => {
				if (resp) {
					hasResults = true;
					wikiPlaceholder.appendChild(wikipediaResult(resp));
				}
			}),
		);
	}

	// Wait for all to finish to hide loading and check empty state
	await Promise.allSettled(tasks);

	loadingIndicator.remove();

	if (!hasResults) {
		document.querySelector(".message").style.display = "flex";
		document.querySelector("#info").hidden = true;
		document.querySelector("#not-found").hidden = false;
		document.querySelector(".message > div").textContent =
			`No results found for "${word}"`;
	}
}

// ========== Event Listeners ==========

dropdown.addEventListener("click", () => menu.classList.toggle("active"));
historyBtn.addEventListener("click", showHistory);
sidePanelClose.addEventListener("click", closePanel);
overlay.addEventListener("click", closePanel);

dropdown.addEventListener("blur", () => {
	setTimeout(() => menu.classList.remove("active"), 200);
});

// Menu item clicks
menu.querySelectorAll(".menu-item").forEach((item) => {
	item.addEventListener("click", (e) => {
		e.preventDefault();
		const action = item.dataset.action;
		menu.classList.remove("active");

		switch (action) {
			case "history":
				showHistory();
				break;
			case "bookmarks":
				showBookmarks();
				break;
			case "random":
				randomWord();
				break;
			case "darkmode":
				toggleDarkMode();
				break;
			case "stats":
				showStats();
				break;
			case "settings":
				showSettings();
				break;
			case "about":
				showAbout();
				break;
			case "exit":
				Neutralino.app.exit();
				break;
		}
	});
});

search.addEventListener("input", () => {
	if (search.value.length === 0) {
		container.innerHTML = "";
		document.querySelector(".message").style.display = "flex";
		document.querySelector("#info").hidden = false;
		document.querySelector("#not-found").hidden = true;
		document.querySelector(".message > div").textContent =
			"Look up definitions of any english term.";
	}
});

search.addEventListener("keypress", (e) => {
	if (e.key === "Enter") performSearch();
});

// Keyboard shortcuts
document.addEventListener("keydown", async (e) => {
	if (e.ctrlKey || e.metaKey) {
		const hotkeys = await getHotkeys();
		const key = e.key.toLowerCase();

		if (key === hotkeys.history) {
			e.preventDefault();
			showHistory();
		} else if (key === hotkeys.bookmarks) {
			e.preventDefault();
			showBookmarks();
		} else if (key === hotkeys.random) {
			e.preventDefault();
			randomWord();
		} else if (key === hotkeys.darkmode) {
			e.preventDefault();
			toggleDarkMode();
		} else if (key === hotkeys.stats) {
			e.preventDefault();
			showStats();
		} else if (key === hotkeys.quit) {
			e.preventDefault();
			Neutralino.app.exit();
		}
	}
	if (e.key === "Escape") {
		closePanel();
		menu.classList.remove("active");
	}
});

// ========== Global Hotkey Search ==========

async function installLookupScript() {
	try {
		const osInfo = await Neutralino.computer.getOSInfo();

		// Check if it's a Linux-based system
		if (!osInfo.name.toLowerCase().includes("linux")) {
			return; // Only install on Linux
		}

		// Check if already installed
		const checkInstalled = await Neutralino.os.execCommand(
			`test -f "$HOME/.local/bin/words-lookup.sh" && echo "exists" || echo "missing"`,
		);

		if (checkInstalled.stdOut.trim() === "exists") {
			console.log("✓ Global lookup script already installed");
			return;
		}

		// Get current working directory
		const pwdCmd = await Neutralino.os.execCommand("pwd");
		const cwd = pwdCmd.stdOut.trim();

		// Check if script exists in source location
		const scriptPath = `${cwd}/scripts/words-lookup.sh`;
		const checkScript = await Neutralino.os.execCommand(
			`test -f "${scriptPath}" && echo "exists" || echo "missing"`,
		);

		if (checkScript.stdOut.trim() !== "exists") {
			console.warn("⚠ Lookup script not found at:", scriptPath);
			return;
		}

		// Create ~/.local/bin if it doesn't exist
		await Neutralino.os.execCommand(`mkdir -p "$HOME/.local/bin"`);

		// Copy script to ~/.local/bin/
		await Neutralino.os.execCommand(
			`cp "${scriptPath}" "$HOME/.local/bin/words-lookup.sh"`,
		);

		// Make it executable
		await Neutralino.os.execCommand(
			`chmod +x "$HOME/.local/bin/words-lookup.sh"`,
		);

		console.log(
			"✓ Global lookup script installed to ~/.local/bin/words-lookup.sh",
		);
		showToast("Global hotkey script installed! Set up shortcut in Settings.");
	} catch (err) {
		console.error("⚠ Could not install lookup script:", err);
	}
}

async function checkGlobalSearch() {
	try {
		// Check if trigger file exists and read it
		const checkCmd = await Neutralino.os.execCommand(
			`test -f "$HOME/.cache/words-search.txt" && cat "$HOME/.cache/words-search.txt" || echo ""`,
		);

		const searchTerm = checkCmd.stdOut.trim();

		if (searchTerm) {
			// Delete the trigger file
			await Neutralino.os.execCommand(`rm -f "$HOME/.cache/words-search.txt"`);

			// Show and focus window
			await Neutralino.window.show();
			await Neutralino.window.focus();

			// Perform the search
			search.value = searchTerm;
			performSearch();

			console.log(`Global search triggered for: ${searchTerm}`);
		}
	} catch (err) {
		// Silently fail - file doesn't exist or permission issue
		console.debug("Global search check:", err);
	}
}

// Initialize
async function initializeApp() {
	// Ensure database is available
	await ensureDatabase();

	// Auto-install global lookup script (Linux only)
	await installLookupScript();

	// Initialize app
	updateRecentSearches();

	// Check for global search trigger
	await checkGlobalSearch();

	// Also check for global search when window gains focus
	Neutralino.events.on("windowFocus", checkGlobalSearch);

	// Poll for global search file as backup (every 500ms)
	setInterval(checkGlobalSearch, 500);

	console.log("Words Dictionary initialized");
}

// Wait for DOM to be ready before initializing
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeApp);
} else {
	initializeApp();
}

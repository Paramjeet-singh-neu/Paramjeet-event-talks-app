# BigQuery Release Pulse 📡

A modern, high-fidelity web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that monitors the official Google Cloud BigQuery Release Notes, provides interactive search/filtering, and includes a smart composer to tweet about selected updates.

---

## 🚀 Key Features

* **Discrete Update Parsing:** Automatically breaks down the daily BigQuery release logs into atomic, type-specific cards (e.g. *Features*, *Announcements*, *Changes*, *Deprecations*, *Issues & Fixes*).
* **Smart Tweet Composer Modal:**
  * Prefills release details into a custom editor.
  * **Auto-Truncation:** Automatically truncates text that exceeds the 280-character limit, preserving space for official source links and hashtags.
  * **Quick Templates:** Instantly draft tweets in *Standard Update*, *Short Summary*, or *Hype Pitch* styles.
  * **Hashtag Selector:** Fast toggles for `#BigQuery`, `#GoogleCloud`, `#GCP`, `#DataAnalytics`, and `#DataEngineering`.
  * **Real-time Progress Indicator:** A micro-animated bar that changes color (green, orange, red) indicating proximity to the character limit.
  * Opens the official **Twitter Web Intent** for safe, authenticated posting.
* **Modern Premium Aesthetics:** A glassmorphic theme containing responsive grids, hover glows, subtle floating mesh background animations, and full dark/light modes.
* **Search & Category Badges:** Easily search note contents or filter by update type. Each category displays a real-time count badge.
* **Server-side Cache & Force Sync:** Avoids rate-limiting the Google feeds server by caching results for 10 minutes in memory. Supports manual forced refresh with a rotating loading spinner.

---

## 🛠️ Project Structure

The project has been kept lightweight and modular using standard files:

* [app.py](file:///Users/paramjeetsingh/downloads/agy-cli-projects/app.py): The Flask server, XML parser (using `xml.etree.ElementTree` and namespace handlers), and HTML divider (using `BeautifulSoup` to split feed sections by `<h3>` headings).
* [templates/index.html](file:///Users/paramjeetsingh/downloads/agy-cli-projects/templates/index.html): HTML skeleton with layout grids, control sidebars, bottom bulk-action bar, and the composer modal.
* [static/css/style.css](file:///Users/paramjeetsingh/downloads/agy-cli-projects/static/css/style.css): Vanilla CSS containing the theme systems (dark/light), layout rules, glow interactions, and keyframe animations.
* [static/js/app.js](file:///Users/paramjeetsingh/downloads/agy-cli-projects/static/js/app.js): Vanilla JavaScript engine controlling active states, search, selection triggers, text formatting, and composer presets.
* [requirements.txt](file:///Users/paramjeetsingh/downloads/agy-cli-projects/requirements.txt): Declared python dependencies.

---

## ⚙️ Running the Application

Follow these steps to run the application locally:

### 1. Set Up a Virtual Environment

Initialize a virtual environment to manage dependencies:
```bash
python3 -m venv .venv
```

### 2. Install Dependencies

Install the requirements package:
```bash
.venv/bin/pip install -r requirements.txt
```

### 3. Start the Server

Run the Flask server (we use port `8080` to avoid conflicts with macOS AirPlay receiver running on port `5000`):
```bash
PORT=8080 .venv/bin/python app.py
```

### 4. View in Browser

Open your browser and navigate to:
```
http://localhost:8080
```

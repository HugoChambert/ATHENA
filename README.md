# Local Qwen Chat UI

A minimal, no-build chat interface for talking to a local Ollama model (default: `qwen2.5-coder`). Runs entirely in your browser and talks directly to Ollama's local API — no server, no framework, no internet connection required.

## Files

- `index.html` — page structure and JavaScript logic (sending messages, streaming responses, checking connection status)
- `style.css` — all visual styling, controlled by CSS variables at the top of the file
- `README.md` — this file

Keep all three files in the same folder — `index.html` links to `style.css` by relative path.

## Setup

1. **Make sure Ollama is installed and running.**
   ```bash
   ollama --version
   ollama serve
   ```
   If `ollama serve` says it's already running, that's fine — leave it running in the background.

2. **Make sure your model is pulled.**
   ```bash
   ollama list
   ```
   You should see `qwen2.5-coder` (or whichever tag you use, like `qwen2.5-coder:7b`) in the list. If not:
   ```bash
   ollama pull qwen2.5-coder
   ```

3. **Allow the browser to talk to Ollama (important — CORS).**
   By default, Ollama blocks requests from a page opened as a local file. Set this environment variable before starting Ollama:
   ```bash
   OLLAMA_ORIGINS=* ollama serve
   ```
   To make this permanent instead of setting it every time:
   - **Mac (Ollama app):**
     ```bash
     launchctl setenv OLLAMA_ORIGINS "*"
     ```
     Then restart the Ollama app.
   - **Linux (systemd):**
     ```bash
     sudo systemctl edit ollama
     ```
     Add:
     ```
     [Service]
     Environment="OLLAMA_ORIGINS=*"
     ```
     Then:
     ```bash
     sudo systemctl restart ollama
     ```
   - **Windows:** Add `OLLAMA_ORIGINS` = `*` as a system environment variable (System Properties → Environment Variables), then restart Ollama.

4. **Open `index.html`** by double-clicking it, or dragging it into your browser.

5. In the top-right of the page:
   - Confirm the host field reads `http://localhost:11434` (the Ollama default).
   - Pick your model from the dropdown — it must exactly match a name/tag from `ollama list`. Edit the `<option>` values in `index.html` if your model tag isn't listed.
   - The status indicator will show "connected" once it can reach Ollama.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Status says "can't reach Ollama" | Ollama isn't running | Run `ollama serve` |
| Connects, but sending a message fails | CORS blocked | Restart Ollama with `OLLAMA_ORIGINS=*` (see step 3) |
| "model not found" error | Model name doesn't match | Run `ollama list` and copy the exact name/tag into the dropdown |
| `curl http://localhost:11434` fails in terminal | Ollama not running, or on a different port | Check `echo $OLLAMA_HOST`, and confirm with `ps aux \| grep ollama` |

You can check the browser console (right-click → Inspect → Console) for the exact error message if something isn't working — it usually says directly whether it's a CORS, network, or model-name issue.

## Customizing

All colors, fonts, and spacing live in `style.css`. The fastest way to reskin the whole UI is to edit the CSS variables at the top of the file:

```css
:root{
  --bg: #12130f;        /* page background */
  --panel: #181a14;     /* input/dropdown background */
  --line: #2b2e24;      /* borders */
  --text: #e8e6dc;      /* main text color */
  --muted: #8b8d80;     /* labels, status text */
  --accent: #b6ff3c;    /* highlight color */
  --user-bubble: #21241a;
  --mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
}
```

No build step is needed — edit, save, and refresh the browser to see changes.

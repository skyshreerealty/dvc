# SkyShree Realty — Digital Visiting Card

Static site (HTML/CSS/JS). Works on GitHub Pages.

## Adding / removing brochures (PDFs)

1. Put the PDF file inside the `brochures/` folder.
2. Add one line to `brochures/brochures.json`:

   ```json
   { "title": "Display Name Shown In UI", "file": "your-file-name.pdf" }
   ```

3. Save. The brochure appears in the UI with a working download button.

> Why a JSON list? Browsers cannot scan a server folder for security reasons,
> so static hosts (GitHub Pages, Netlify, etc.) can't auto-list files.
> The manifest is the standard, reliable approach and works everywhere.

## Local testing

Opening `index.html` directly (file://) will block the brochure list from
loading because browsers forbid `fetch()` on local files. Run a tiny local
server instead:

```bash
cd /Users/uttamsangani/DVC
python3 -m http.server 8000
# then open http://localhost:8000
```

(Downloads and the JSON list work fine once served over http, including on GitHub Pages.)

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Source: `main` branch, `/ (root)`.
3. Your card goes live at `https://<username>.github.io/<repo>/`.
# dvc

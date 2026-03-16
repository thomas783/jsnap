# jsnap

**paste. snap. done.**

A clean, fast JSON formatter with collapsible tree view. No frameworks, no ads, no bloat.

## Features

- **Instant formatting** — paste JSON and see a formatted tree view immediately
- **Collapse / Expand** — click nodes to toggle, use +/- buttons for depth control
- **Error recovery** — auto-fixes common errors (missing commas) and highlights problem lines
- **Search** — find keys and values in the tree, auto-expands collapsed nodes
- **Save & Load** — save JSON entries to localStorage with timestamps
- **Copy** — copy raw input or formatted output independently
- **Dark / Light mode** — toggle with theme button, persists across sessions
- **Syntax highlighting** — keys, strings, numbers, booleans, null each in distinct colors

## Tech Stack

Vanilla HTML / CSS / JavaScript. No dependencies, no build step.

## Run Locally

Open `index.html` in a browser, or serve with any static server:

```bash
python3 -m http.server 8080
```

## Deploy

Configured for [Vercel](https://vercel.com) static deployment. Just connect the repo and deploy.

## License

MIT

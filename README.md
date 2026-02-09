# codesnap

Generate pretty code screenshots from your terminal. Catppuccin Mocha and Latte themes, platform-optimized presets, auto font scaling.

## Why

Every "code screenshot" tool is either a web app that wants your code on their servers, or outputs something that looks like it was made in 2003. This is a single-file Node.js module that generates beautiful code images locally.

## Install

```bash
npm install playwright
# codesnap uses playwright's chromium for rendering
```

Copy `codesnap.mjs` into your project (it's one file).

## Usage

```javascript
import { snap } from './codesnap.mjs';

const code = `// code screenshots that don't look like 2003
import { snap } from './codesnap.mjs';
await snap(code, 'output.png', {
  theme: 'mocha', preset: 'x',  // catppuccin
});`;

await snap(code, 'output.png', {
  title: 'codesnap.mjs',
  lang: 'javascript',
  theme: 'mocha',
});
```

Produces:

![example output](social-preview.png)

## Presets

| Preset   | Size      | Aspect | Use case              |
|----------|-----------|--------|-----------------------|
| `x`      | 1200x675  | 16:9   | X/Twitter posts       |
| `x-tall` | 1080x1080 | 1:1    | X posts (longer code) |
| `ig`     | 1080x1080 | 1:1    | Instagram             |
| `og`     | 1200x630  | 1.9:1  | Social preview / OG   |

Without a preset, codesnap auto-sizes to fit the code (square for 10+ lines, 16:9 for shorter).

## Options

```javascript
{
  title: 'file.rs',       // window title bar text
  lang: 'rust',           // syntax highlighting language
  theme: 'mocha',         // 'mocha' (dark) or 'latte' (light)
  preset: 'x',            // platform preset (see above)
  fontSize: '14px',       // base font size
  maxFontSize: 16,        // cap for auto-scaling
  showLineNumbers: true,  // line numbers (default: true)
  background: 'linear-gradient(...)' // custom background
}
```

## How it works

Builds an HTML page with Catppuccin-themed syntax highlighting, renders it with Playwright's headless Chromium, and screenshots it. Font size auto-scales to fill the target dimensions. Long lines wrap at word boundaries.

## License

MIT

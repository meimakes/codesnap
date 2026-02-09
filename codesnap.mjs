#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename, extname } from 'path';

// Catppuccin Mocha palette
const mocha = {
  rosewater: '#f5e0dc', flamingo: '#f2cdcd', pink: '#f5c2e7',
  mauve: '#cba6f7', red: '#f38ba8', maroon: '#eba0ac',
  peach: '#fab387', yellow: '#f9e2af', green: '#a6e3a1',
  teal: '#94e2d5', sky: '#89dceb', sapphire: '#74c7ec',
  blue: '#89b4fa', lavender: '#b4befe',
  text: '#cdd6f4', subtext1: '#bac2de', subtext0: '#a6adc8',
  overlay2: '#9399b2', overlay1: '#7f849c', overlay0: '#6c7086',
  surface2: '#585b70', surface1: '#45475a', surface0: '#313244',
  base: '#1e1e2e', mantle: '#181825', crust: '#11111b',
};

// Catppuccin Latte palette  
const latte = {
  rosewater: '#dc8a78', flamingo: '#dd7878', pink: '#ea76cb',
  mauve: '#8839ef', red: '#d20f39', maroon: '#e64553',
  peach: '#fe640b', yellow: '#df8e1d', green: '#40a02b',
  teal: '#179299', sky: '#04a5e5', sapphire: '#209fb5',
  blue: '#1e66f5', lavender: '#7287fd',
  text: '#4c4f69', subtext1: '#5c5f77', subtext0: '#6c6f85',
  overlay2: '#7c7f93', overlay1: '#8c8fa1', overlay0: '#9ca0b0',
  surface2: '#acb0be', surface1: '#bcc0cc', surface0: '#ccd0da',
  base: '#eff1f5', mantle: '#e6e9ef', crust: '#dce0e8',
};

const themes = { mocha, latte };

// Syntax highlighting token colors (Catppuccin Mocha)
const syntaxColors = {
  mocha: {
    keyword: mocha.mauve,
    string: mocha.green,
    comment: mocha.overlay1,
    function: mocha.blue,
    number: mocha.peach,
    type: mocha.yellow,
    operator: mocha.sky,
    variable: mocha.text,
    property: mocha.lavender,
    punctuation: mocha.overlay2,
  },
  latte: {
    keyword: latte.mauve,
    string: latte.green,
    comment: latte.overlay1,
    function: latte.blue,
    number: latte.peach,
    type: latte.yellow,
    operator: latte.sky,
    variable: latte.text,
    property: latte.lavender,
    punctuation: latte.overlay2,
  }
};

// Token-based syntax highlighter (avoids regex overlap issues)
function highlightCode(code, lang, themeName) {
  if (lang === 'text' || lang === 'plain' || lang === 'plaintext') {
    return code.split('\n').map(line => escapeHTML(line)).join('\n');
  }
  const colors = syntaxColors[themeName];
  
  const keywords = new Set(['fn', 'let', 'mut', 'const', 'if', 'else', 'for', 'while', 'return', 'use', 'pub', 'struct', 'impl', 'enum', 'match', 'async', 'await', 'import', 'export', 'from', 'function', 'class', 'def', 'self', 'print', 'type', 'interface', 'where', 'trait', 'mod', 'crate', 'super', 'true', 'false', 'in', 'as', 'move', 'try', 'except', 'raise', 'with', 'yield', 'lambda', 'pass', 'break', 'continue']);
  const macros = new Set(['println!', 'print!', 'format!', 'vec!', 'macro_rules!', 'todo!', 'panic!', 'assert!']);
  const builtins = new Set(['None', 'Some', 'Ok', 'Err', 'Result', 'Option', 'String', 'Vec']);

  // Tokenize line by line
  return code.split('\n').map(line => {
    let result = '';
    let i = 0;
    
    while (i < line.length) {
      // Line comment (// or #)
      if ((line[i] === '/' && line[i+1] === '/' && (i === 0 || line[i-1] !== ':')) || (line[i] === '#' && (i === 0 || line[i-1] === ' ' || line[i-1] === '\t'))) {
        const rest = escapeHTML(line.slice(i));
        result += `<span style="color:${colors.comment};font-style:italic">${rest}</span>`;
        i = line.length;
        continue;
      }
      
      // Strings
      if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
        const quote = line[i];
        let j = i + 1;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++; // skip escaped
          j++;
        }
        j++; // include closing quote
        const str = escapeHTML(line.slice(i, j));
        result += `<span style="color:${colors.string}">${str}</span>`;
        i = j;
        continue;
      }
      
      // Numbers
      if (/\d/.test(line[i]) && (i === 0 || /[\s,(\[{=:+\-*/]/.test(line[i-1]))) {
        let j = i;
        while (j < line.length && /[\d._xXa-fA-F]/.test(line[j])) j++;
        const num = escapeHTML(line.slice(i, j));
        result += `<span style="color:${colors.number}">${num}</span>`;
        i = j;
        continue;
      }
      
      // Words (identifiers/keywords)
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        // Check for macro (word!)
        const word = line.slice(i, j);
        const wordBang = line[j] === '!' ? word + '!' : null;
        
        if (wordBang && macros.has(wordBang)) {
          result += `<span style="color:${colors.keyword};font-weight:bold">${escapeHTML(wordBang)}</span>`;
          i = j + 1;
        } else if (keywords.has(word)) {
          result += `<span style="color:${colors.keyword};font-weight:bold">${escapeHTML(word)}</span>`;
          i = j;
        } else if (builtins.has(word)) {
          result += `<span style="color:${colors.type}">${escapeHTML(word)}</span>`;
          i = j;
        } else if (/^[A-Z]/.test(word)) {
          result += `<span style="color:${colors.type}">${escapeHTML(word)}</span>`;
          i = j;
        } else if (line[j] === '(') {
          result += `<span style="color:${colors.function}">${escapeHTML(word)}</span>`;
          i = j;
        } else {
          result += escapeHTML(word);
          i = j;
        }
        continue;
      }
      
      // Operators and punctuation
      result += escapeHTML(line[i]);
      i++;
    }
    
    return result;
  }).join('\n');
}

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Preset sizes for social platforms
const presets = {
  'x':        { width: 1200, height: 675 },   // X/Twitter single image (16:9)
  'x-tall':   { width: 1080, height: 1080 },  // X square
  'x-pair':   { width: 700,  height: 800 },   // X two-image post
  'ig':       { width: 1080, height: 1080 },   // Instagram square
  'ig-story': { width: 1080, height: 1920 },   // Instagram story
  'og':       { width: 1200, height: 630 },    // Open Graph
  'auto':     null,                             // Auto-size to content (original behavior)
};

function buildHTML(code, options = {}) {
  const {
    theme = 'mocha',
    title = '',
    lang = 'rust',
    fontFamily = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    fontSize = '14px',
    padding = '24px',
    borderRadius = '12px',
    showLineNumbers = true,
    background = 'gradient', // 'gradient', 'solid', or custom CSS
    windowControls = true,
    targetWidth = null,
    targetHeight = null,
  } = options;

  const t = themes[theme];
  const highlighted = highlightCode(code, lang, theme);
  const lines = highlighted.split('\n');

  const bgStyle = background === 'gradient'
    ? `background: linear-gradient(135deg, ${t.mauve}33 0%, ${t.blue}33 50%, ${t.teal}33 100%);`
    : background === 'solid'
    ? `background: ${t.crust};`
    : `background: ${background};`;

  const lineNumbersHTML = showLineNumbers
    ? lines.map((_, i) => `<span style="color:${t.overlay0};user-select:none;text-align:right;padding-right:16px;min-width:2em;display:inline-block">${i + 1}</span>`).join('\n')
    : '';

  const windowControlsHTML = windowControls ? `
    <div style="display:flex;gap:8px;padding:12px 16px;align-items:center">
      <div style="width:12px;height:12px;border-radius:50%;background:${t.red}"></div>
      <div style="width:12px;height:12px;border-radius:50%;background:${t.yellow}"></div>
      <div style="width:12px;height:12px;border-radius:50%;background:${t.green}"></div>
      ${title ? `<span style="color:${t.subtext0};font-size:13px;margin-left:8px;font-family:${fontFamily}">${title}</span>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      ${bgStyle}
      display: flex;
      justify-content: center;
      align-items: center;
      ${targetWidth && targetHeight ? `width: ${targetWidth/2}px; height: ${targetHeight/2}px;` : 'min-height: 100vh;'}
      padding: ${targetWidth ? '32px' : '48px'};
      overflow: hidden;
    }
    .window {
      background: ${t.base};
      border-radius: ${borderRadius};
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${t.surface0};
      overflow: hidden;
      max-width: ${targetWidth ? '85%' : '720px'};
      ${targetHeight ? 'max-height: 85%;' : ''}
      width: auto;
    }
    .code-container {
      padding: ${padding};
      padding-top: 16px;
      padding-bottom: ${targetWidth ? '36px' : padding};
      overflow-x: auto;
    }
    pre {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${targetWidth ? '1.4' : '1.6'};
      color: ${t.text};
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
    .line {
      display: flex;
    }
  </style>
</head>
<body>
  <div class="window">
    ${windowControlsHTML}
    <div class="code-container">
      <pre>${lines.map((line, i) => {
        const ln = showLineNumbers ? `<span style="color:${t.overlay0};user-select:none;text-align:right;padding-right:16px;min-width:2em;display:inline-block">${i + 1}</span>` : '';
        return `<span class="line">${ln}<span>${line}</span></span>`;
      }).join('\n')}</pre>
    </div>
  </div>
</body>
</html>`;
}

export async function snap(code, outputPath, options = {}) {
  // Resolve preset
  if (options.preset) {
    const p = presets[options.preset];
    if (p) {
      options.targetWidth = p.width;
      options.targetHeight = p.height;
    }
  }

  const targetW = options.targetWidth;
  const targetH = options.targetHeight;
  const minFontSize = options.minFontSize || 11;
  const maxFontSize = options.maxFontSize || 16;
  const startFontSize = parseInt(options.fontSize) || 14;

  const browser = await chromium.launch();

  if (targetW && targetH) {
    // Fixed-size mode: binary search for best font size
    // We use CSS pixels at 1x for measuring, then screenshot at 2x for retina
    const measureW = Math.ceil(targetW / 2);
    const measureH = Math.ceil(targetH / 2);

    let bestFontSize = minFontSize;
    let bestHTML = '';

    for (let fs = maxFontSize; fs >= minFontSize; fs--) {
      const testOptions = { ...options, fontSize: `${fs}px`, targetWidth: targetW, targetHeight: targetH };
      const html = buildHTML(code, testOptions);
      
      const page = await browser.newPage({
        viewport: { width: measureW, height: measureH },
        deviceScaleFactor: 1,
      });
      await page.setContent(html, { waitUntil: 'networkidle' });
      
      // Check if content fits — temporarily remove overflow:hidden to measure true height
      const fits = await page.evaluate(() => {
        const win = document.querySelector('.window');
        const body = document.body;
        win.style.overflow = 'visible';
        win.style.maxHeight = 'none';
        const contentFits = win.scrollHeight <= (body.clientHeight * 0.85) && win.scrollWidth <= (body.clientWidth * 0.85);
        win.style.overflow = 'hidden';
        return contentFits;
      });
      
      await page.close();
      
      if (fits) {
        bestFontSize = fs;
        bestHTML = html;
        break;
      }
      bestHTML = html; // keep last attempt as fallback
    }

    // If still doesn't fit at min font, truncate
    if (!bestHTML || bestFontSize === minFontSize) {
      const lines = code.split('\n');
      // Try removing lines until it fits
      for (let maxLines = lines.length; maxLines >= 3; maxLines--) {
        const truncated = lines.slice(0, maxLines).join('\n') + '\n// ...';
        const testOptions = { ...options, fontSize: `${minFontSize}px`, targetWidth: targetW, targetHeight: targetH };
        const html = buildHTML(truncated, testOptions);
        
        const page = await browser.newPage({
          viewport: { width: measureW, height: measureH },
          deviceScaleFactor: 1,
        });
        await page.setContent(html, { waitUntil: 'networkidle' });
        
        const fits = await page.evaluate(() => {
          const win = document.querySelector('.window');
          const body = document.body;
          win.style.overflow = 'visible';
          win.style.maxHeight = 'none';
          const ok = win.scrollHeight <= (body.clientHeight * 0.85) && win.scrollWidth <= (body.clientWidth * 0.85);
          win.style.overflow = 'hidden';
          return ok;
        });
        
        await page.close();
        
        if (fits) {
          bestHTML = html;
          break;
        }
      }
    }

    // Final render at 2x
    const htmlPath = outputPath.replace(/\.\w+$/, '.html');
    writeFileSync(htmlPath, bestHTML);

    const page = await browser.newPage({
      viewport: { width: measureW, height: measureH },
      deviceScaleFactor: 2,
    });
    await page.setContent(bestHTML, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outputPath, fullPage: false });
    await page.close();
    console.log(`Saved: ${outputPath} (${targetW}x${targetH}, ${bestFontSize}px)`);

  } else {
    // Auto-size mode (original behavior)
    const html = buildHTML(code, options);
    const htmlPath = outputPath.replace(/\.\w+$/, '.html');
    writeFileSync(htmlPath, html);

    const page = await browser.newPage({
      viewport: { width: 900, height: 600 },
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: 'networkidle' });

    const body = await page.$('body');
    const box = await body.boundingBox();
    await page.setViewportSize({
      width: Math.ceil(box.width),
      height: Math.ceil(box.height),
    });

    await page.screenshot({ path: outputPath, fullPage: true });
    await page.close();
    console.log(`Saved: ${outputPath} (auto)`);
  }

  await browser.close();
}

export { presets };

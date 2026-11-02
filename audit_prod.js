const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const headersPath = path.join(root, '_headers');
const headers = fs.existsSync(headersPath)
  ? fs.readFileSync(headersPath, 'utf8')
  : '';

let passed = true;
const check = (condition, description) => {
  if (!condition) passed = false;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
};

const requiredIds = [
  'intro-overlay',
  'site-header',
  'hero',
  'event-details',
  'countdown',
  'send-wish',
  'countdown-days',
  'countdown-hours',
  'countdown-minutes',
  'countdown-seconds',
  'countdown-timer',
  'countdown-expired',
  'wish-form',
  'wish-name',
  'wish-message',
  'char-counter',
  'form-status',
  'wish-submit-btn',
  'music-toggle-btn',
  'mobile-menu-btn',
  'nav-menu',
  'venue-map-link',
  'wishes-ticker',
  'ticker-viewport',
  'ticker-track',
];

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const idCounts = new Map();
ids.forEach((id) => idCounts.set(id, (idCounts.get(id) || 0) + 1));

requiredIds.forEach((id) => {
  check(idCounts.get(id) === 1, `Unique required DOM id: ${id}`);
});
check(
  [...idCounts.values()].every((count) => count === 1),
  'No duplicate DOM ids'
);
check(!idCounts.has('guest-wishes'), 'Retired guest-wishes section is absent');

const localReferences = [
  ...html.matchAll(/\b(?:src|href|srcset)="([^"]+)"/g),
].flatMap((match) =>
  match[0].startsWith('srcset=')
    ? match[1].split(',').map((item) => item.trim().split(/\s+/)[0])
    : [match[1]]
);

localReferences
  .filter((reference) => {
    return (
      reference &&
      !reference.startsWith('#') &&
      !reference.startsWith('//') &&
      !/^[a-z][a-z\d+.-]*:/i.test(reference)
    );
  })
  .forEach((reference) => {
    const localPath = decodeURIComponent(reference.split(/[?#]/)[0]);
    check(
      fs.existsSync(path.resolve(root, localPath)),
      `Local HTML asset exists: ${localPath}`
    );
  });

const runtimeAssets = new Set(
  [...js.matchAll(/['"](assets\/[^'"]+)['"]/g)].map((match) => match[1])
);
runtimeAssets.forEach((asset) => {
  check(fs.existsSync(path.resolve(root, asset)), `Local JavaScript asset exists: ${asset}`);
});

const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
let braceBalance = 0;
for (const character of cssWithoutComments) {
  if (character === '{') braceBalance += 1;
  if (character === '}') braceBalance -= 1;
}
check(braceBalance === 0, `CSS braces are balanced (${braceBalance})`);
check(css.includes('.wishes-ticker-bar'), 'Wishes ticker styles are present');
check(css.includes('.ticker-viewport'), 'Scrollable ticker styles are present');
check(css.includes('prefers-reduced-motion'), 'Reduced-motion support is present');

check(fs.existsSync(headersPath), 'Static-host response headers file exists');
[
  /^  X-Content-Type-Options:\s*nosniff$/im,
  /^  X-Frame-Options:\s*DENY$/im,
  /^  Referrer-Policy:\s*strict-origin-when-cross-origin$/im,
  /^  Permissions-Policy:/im,
].forEach((pattern) => check(pattern.test(headers), `Security header: ${pattern.source}`));
check(/Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/i.test(headers), 'Assets use long-lived immutable caching');
check(/Cache-Control:\s*public,\s*max-age=0,\s*must-revalidate/i.test(headers), 'HTML and app code revalidate on deploy');

check(
  /https:\/\/www\.gstatic\.com\/firebasejs\/13\.1\.0\//.test(js),
  'Firebase SDK uses a pinned version'
);

console.log(`\n${passed ? 'Production sanity checks passed.' : 'Production sanity checks failed.'}`);
if (!passed) process.exitCode = 1;

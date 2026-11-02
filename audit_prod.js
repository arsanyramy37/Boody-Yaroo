const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/arsanyramy/Desktop/Boody-Yaroo';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css  = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const js   = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

let pass = true;
const log = (ok, msg) => { if (!ok) pass = false; console.log((ok ? '✅' : '❌') + ' ' + msg); };

// 1. DOM IDs
const ids = [
  'intro-overlay','site-header','hero','event-details','countdown','send-wish',
  'guest-wishes','countdown-days','countdown-hours','countdown-minutes',
  'countdown-seconds','countdown-timer','countdown-expired','wishes-list',
  'wishes-empty','wishes-error','wish-form','wish-name','wish-message',
  'char-counter','form-status','wish-submit-btn','wishes-retry-btn',
  'music-toggle-btn','mobile-menu-btn','nav-menu','venue-map-link'
];
ids.forEach(id => log(html.includes(`id="${id}"`), `DOM id: ${id}`));

// 2. Asset files
const assets = [
  'assets/imgs/envelope.webp','assets/imgs/opened.webp',
  'assets/imgs/overlaybgmobile.webp','assets/imgs/overlaybglap.webp',
  'assets/imgs/BY.webp','assets/audio/music.mp3'
];
assets.forEach(a => {
  const exists = fs.existsSync(path.join(ROOT, a));
  log(exists, `Asset exists: ${a}`);
});

// 3. intro-names-above in HTML
log(html.includes('intro-names-above'), 'intro-names-above element present');

// 4. is-hidden-for-open in JS
log(js.includes('is-hidden-for-open'), 'JS hides text on open');

// 5. No raw Firebase key
const rawKeyPattern = /AIzaSy[A-Za-z0-9_-]{33}/;
log(!rawKeyPattern.test(js), 'No raw Firebase key in JS');

// 6. CSS brace balance
let braces = 0;
for (const ch of css) { if (ch==='{') braces++; else if (ch==='}') braces--; }
log(braces === 0, `CSS brace balance = ${braces}`);

// 7. invitation-open in CSS
log(css.includes('invitation-open'), 'body.invitation-open unlock rule present');

// 8. preload opened.webp
log(html.includes('preload') && html.includes('opened.webp'), 'opened.webp preloaded');

// 9. viewport-fit=cover
log(html.includes('viewport-fit=cover'), 'viewport-fit=cover meta present');

// 10. _headers file
log(fs.existsSync(path.join(ROOT, '_headers')), '_headers file present');

console.log('\n' + (pass ? '🎉 ALL CHECKS PASSED — ready for production' : '⚠️  SOME CHECKS FAILED — review above'));


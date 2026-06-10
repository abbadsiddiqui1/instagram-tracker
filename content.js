'use strict';

const GRACE_MS   = 5 * 60 * 1000; // 5-minute grace period after solving
const CHECK_MS   = 10_000;         // re-check every 10 seconds
const OVERLAY_ID = '__igt_overlay__';

let expectedAnswer = null;

// ── helpers ──────────────────────────────────────────────────────────────────

const todayKey = () => new Date().toISOString().slice(0, 10);

function makeProblem() {
  const type = Math.floor(Math.random() * 3);
  if (type === 0) {
    const a = 100 + Math.floor(Math.random() * 900);
    const b = 100 + Math.floor(Math.random() * 900);
    return { text: `${a} + ${b}`, answer: a + b };
  } else if (type === 1) {
    const a = 200 + Math.floor(Math.random() * 600);
    const b =  50 + Math.floor(Math.random() * 150);
    return { text: `${a} − ${b}`, answer: a - b };
  } else {
    const a = 3 + Math.floor(Math.random() * 10); // 3–12
    const b = 3 + Math.floor(Math.random() * 10);
    return { text: `${a} × ${b}`, answer: a * b };
  }
}

// ── overlay ───────────────────────────────────────────────────────────────────

function getOrCreateOverlay() {
  let el = document.getElementById(OVERLAY_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    document.documentElement.appendChild(el);
  }
  return el;
}

function renderProblem(overlay) {
  const { text, answer } = makeProblem();
  expectedAnswer = answer;
  const prob = overlay.querySelector('.__igt_problem__');
  const inp  = overlay.querySelector('.__igt_input__');
  const err  = overlay.querySelector('.__igt_error__');
  if (prob) prob.textContent = text;
  if (inp)  { inp.value = ''; inp.focus(); }
  if (err)  err.textContent = '';
}

function showOverlay(todaySec, limitSec) {
  const overlay = getOrCreateOverlay();
  if (overlay.style.display === 'flex') return; // already visible, don't rebuild

  const todayMin = Math.round(todaySec / 60);
  const limitMin = Math.round(limitSec / 60);
  const { text, answer } = makeProblem();
  expectedAnswer = answer;

  overlay.innerHTML = `
    <div class="__igt_box__">
      <div class="__igt_icon__">&#128683;</div>
      <h1 class="__igt_title__">Daily limit reached</h1>
      <p class="__igt_meta__">
        <span class="__igt_used__">${todayMin} min used</span>
        &nbsp;&bull;&nbsp;
        <span class="__igt_limit__">${limitMin} min limit</span>
      </p>
      <div class="__igt_divider__"></div>
      <p class="__igt_label__">Solve to unlock 5 minutes:</p>
      <p class="__igt_problem__">${text}</p>
      <div class="__igt_row__">
        <input class="__igt_input__" type="number" placeholder="Answer" autocomplete="off" />
        <button class="__igt_btn__">&#10003;</button>
      </div>
      <p class="__igt_error__"></p>
    </div>
  `;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.__igt_input__').focus();

  function attempt() {
    const val = parseInt(overlay.querySelector('.__igt_input__').value, 10);
    if (val === expectedAnswer) {
      chrome.storage.local.set({ gracePeriodUntil: Date.now() + GRACE_MS });
      hideOverlay(overlay);
    } else {
      const box = overlay.querySelector('.__igt_box__');
      box.classList.remove('__igt_shake__');
      void box.offsetWidth; // force reflow to restart animation
      box.classList.add('__igt_shake__');
      renderProblem(overlay);
    }
  }

  overlay.querySelector('.__igt_btn__').addEventListener('click', attempt);
  overlay.querySelector('.__igt_input__').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attempt();
  });

  // Re-inject if someone deletes the overlay via devtools
  new MutationObserver(() => {
    if (!document.getElementById(OVERLAY_ID)) {
      document.documentElement.appendChild(overlay);
    }
  }).observe(document.documentElement, { childList: true });
}

function hideOverlay(overlay) {
  if (!overlay) overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

// ── check loop ────────────────────────────────────────────────────────────────

async function check() {
  const { usage = {}, dailyLimit = 30, gracePeriodUntil = 0 } =
    await chrome.storage.local.get(['usage', 'dailyLimit', 'gracePeriodUntil']);

  const todaySec  = usage[todayKey()] || 0;
  const limitSec  = dailyLimit * 60;
  const inGrace   = Date.now() < gracePeriodUntil;

  if (todaySec >= limitSec && !inGrace) {
    showOverlay(todaySec, limitSec);
  } else {
    hideOverlay();
  }
}

check();
setInterval(check, CHECK_MS);

// Immediate re-check when background flushes storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.usage || changes.gracePeriodUntil || changes.dailyLimit) check();
});

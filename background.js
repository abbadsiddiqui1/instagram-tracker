'use strict';

let sessionStart = null;

const todayKey = () => new Date().toISOString().slice(0, 10);

async function flushSession() {
  if (!sessionStart) return;
  const elapsed = Math.round((Date.now() - sessionStart) / 1000);
  if (elapsed <= 0) return;
  sessionStart = Date.now(); // reset so next flush doesn't double-count
  const { usage = {} } = await chrome.storage.local.get('usage');
  const key = todayKey();
  usage[key] = (usage[key] || 0) + elapsed;
  await chrome.storage.local.set({ usage });
}

async function endSession() {
  await flushSession();
  sessionStart = null;
}

async function isInstagram(tabId) {
  try {
    const { url = '' } = await chrome.tabs.get(tabId);
    return url.includes('instagram.com');
  } catch { return false; }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await endSession();
  if (await isInstagram(tabId)) sessionStart = Date.now();
});

chrome.tabs.onUpdated.addListener(async (tabId, { status }, tab) => {
  if (status !== 'complete') return;
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!active || active.id !== tabId) return;
  await endSession();
  if ((tab.url || '').includes('instagram.com')) sessionStart = Date.now();
});

chrome.windows.onFocusChanged.addListener(async (wid) => {
  if (wid === chrome.windows.WINDOW_ID_NONE) {
    await endSession();
    return;
  }
  const [active] = await chrome.tabs.query({ active: true, windowId: wid });
  if (active && await isInstagram(active.id)) sessionStart = Date.now();
  else await endSession();
});

// Flush every minute so popup always shows fresh-ish data
chrome.alarms.create('flush', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'flush') flushSession(); });

// Popup requests a flush before reading storage
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'flush') {
    flushSession().then(() => respond({}));
    return true; // keep channel open for async response
  }
});

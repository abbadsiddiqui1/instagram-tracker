'use strict';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function fmtMin(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function drawChart(canvas, usage, limitMin) {
  const ctx     = canvas.getContext('2d');
  const W       = canvas.width;
  const H       = canvas.height;
  const mTop    = 16;
  const mBottom = 28;
  const mLeft   = 38;
  const mRight  = 8;
  const chartW  = W - mLeft - mRight;
  const chartH  = H - mTop - mBottom;

  ctx.clearRect(0, 0, W, H);

  const days   = last7Days();
  const values = days.map(k => Math.round((usage[k] || 0) / 60)); // in minutes
  const maxVal = Math.max(limitMin * 1.3, ...values, 1);

  const barW   = (chartW / 7) * 0.55;
  const slotW  = chartW / 7;

  // Grid lines
  ctx.strokeStyle = '#1f1f1f';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = mTop + chartH - (i / steps) * chartH;
    ctx.beginPath();
    ctx.moveTo(mLeft, y);
    ctx.lineTo(mLeft + chartW, y);
    ctx.stroke();
    // Y label
    const label = Math.round((i / steps) * maxVal);
    ctx.fillStyle = '#444';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(label, mLeft - 4, y + 4);
  }

  // Limit line
  const limitY = mTop + chartH - (limitMin / maxVal) * chartH;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#e05c5c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mLeft, limitY);
  ctx.lineTo(mLeft + chartW, limitY);
  ctx.stroke();
  ctx.restore();

  // Bars + day labels
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  days.forEach((key, i) => {
    const val   = values[i];
    const barH  = (val / maxVal) * chartH;
    const x     = mLeft + i * slotW + (slotW - barW) / 2;
    const y     = mTop + chartH - barH;

    ctx.fillStyle = val >= limitMin ? '#e05c5c' : '#4caf7d';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Day label
    const d = new Date(key + 'T12:00:00');
    const label = key === todayKey() ? 'Today' : dayNames[d.getDay()];
    ctx.fillStyle = key === todayKey() ? '#aaa' : '#555';
    ctx.font = key === todayKey() ? 'bold 10px system-ui' : '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barW / 2, H - 8);
  });
}

async function render() {
  // Ask background to flush current session before we read storage
  try {
    await chrome.runtime.sendMessage({ type: 'flush' });
  } catch { /* background may not be running yet */ }

  const { usage = {}, dailyLimit = 30, gracePeriodUntil = 0 } =
    await chrome.storage.local.get(['usage', 'dailyLimit', 'gracePeriodUntil']);

  const todaySec  = usage[todayKey()] || 0;
  const limitSec  = dailyLimit * 60;
  const pct       = Math.min(100, (todaySec / limitSec) * 100);

  document.getElementById('today-used').textContent = fmtMin(todaySec);
  document.getElementById('today-limit-display').textContent = `${dailyLimit} min`;

  const fill = document.getElementById('progress-fill');
  fill.style.width = `${pct}%`;
  fill.style.background = pct >= 100 ? '#e05c5c' : pct >= 75 ? '#f4b728' : '#4caf7d';

  const graceEl = document.getElementById('grace-msg');
  if (Date.now() < gracePeriodUntil) {
    const mins = Math.ceil((gracePeriodUntil - Date.now()) / 60000);
    graceEl.textContent = `⚡ Grace period: ${mins} min remaining`;
  } else {
    graceEl.textContent = '';
  }

  document.getElementById('limit-input').value = dailyLimit;

  drawChart(document.getElementById('chart'), usage, dailyLimit);
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const val = parseInt(document.getElementById('limit-input').value, 10);
  if (!val || val < 1) return;
  await chrome.storage.local.set({ dailyLimit: val });
  const confirm = document.getElementById('save-confirm');
  confirm.textContent = 'Saved!';
  setTimeout(() => { confirm.textContent = ''; }, 1500);
  render();
});

render();

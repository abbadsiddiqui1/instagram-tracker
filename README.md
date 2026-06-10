# Instagram Time Tracker

A Chrome extension that tracks time spent on Instagram, shows a weekly usage dashboard, and blocks access with a math problem once you exceed your daily limit.

## Features

- **Time tracking** — automatically tracks how long you spend on Instagram each day
- **Weekly dashboard** — bar chart of the last 7 days with a limit line
- **Daily limit** — set your own limit in minutes via the popup
- **Math friction** — when you hit your limit, solve an arithmetic problem to unlock 5 more minutes
- **Grace period** — correct answer grants 5 minutes of unblocked access before the gate reappears

## How it works

| Component | Role |
|---|---|
| `background.js` | Service worker — tracks the active Instagram tab using timestamps, flushes usage to storage every minute |
| `content.js` | Injected into instagram.com — checks usage every 10s, shows/hides the math overlay |
| `content.css` | Overlay styles, isolated with `!important` to prevent Instagram's CSS from interfering |
| `popup.html/js/css` | Dashboard — today's usage, progress bar, weekly chart, limit setter |

## Installation

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select this folder
5. Click the extension icon in your toolbar to open the dashboard

## Usage

**Setting your limit:**
Open the popup, enter a number of minutes in the "Daily limit" field, and click **Save**.

**When you hit your limit:**
A full-screen overlay appears on Instagram with a math problem. Solve it correctly to get 5 more minutes. Wrong answers reset the problem.

**Checking your usage:**
Click the extension icon any time to see today's usage, your progress toward the limit, and a bar chart of the last 7 days.

## Math problems

Problems are randomly generated from three types:
- 3-digit addition (e.g. `347 + 582`)
- 3-digit subtraction (e.g. `423 − 67`)
- 2-digit multiplication (e.g. `8 × 12`)

## Privacy

All data is stored locally in your browser via `chrome.storage.local`. Nothing is sent to any server.

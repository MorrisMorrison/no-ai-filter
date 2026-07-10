// Tracks per-tab hidden counts and drives the toolbar badge.
const counts = {};

function setBadge(tabId, n) {
  chrome.action.setBadgeText({ tabId, text: n ? String(n) : "" });
}

chrome.action.setBadgeBackgroundColor({ color: "#d33333" });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "noai:count" && sender.tab) {
    counts[sender.tab.id] = msg.count;
    setBadge(sender.tab.id, msg.count);
    return;
  }

  if (msg.type === "noai:getCount") {
    sendResponse({ count: counts[msg.tabId] || 0 });
    return true; // keep the message channel open for the async response
  }
});

// Reset the count when a tab starts navigating, and clean up when it closes.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") {
    counts[tabId] = 0;
    setBadge(tabId, 0);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete counts[tabId];
});

// Tracks per-tab hidden counts and drives the toolbar badge.
const counts = {};

function setBadge(tabId, n) {
  // The tab may have closed or navigated between the content-script message and this
  // call — setBadgeText then rejects with "No tab with id". That's expected; swallow it.
  chrome.action.setBadgeText({ tabId, text: n ? String(n) : "" }).catch(() => {});
}

chrome.action.setBadgeBackgroundColor({ color: "#d33333" }).catch(() => {});

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

chrome.webNavigation.onCompleted.addListener((details) => {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    files: ["content.js"]
  });
}, { url: [{ urlMatches: 'https://app.asana.com/*' }] });
chrome.webNavigation.onCompleted.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["content.js"]
    });
  });
}, { url: [{ urlMatches: 'https://app.asana.com/*' }] });

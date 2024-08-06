chrome.webNavigation.onCompleted.addListener((details) => {
  console.log("Navigation completed:", details);
  if (details.frameId === 0) { // Ensure it's the main frame
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content.js"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Script execution failed:", chrome.runtime.lastError.message);
      } else {
        console.log("Script executed successfully");
      }
    });
  }
}, { url: [{ urlMatches: 'https://app.asana.com/*' }] });
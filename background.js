// Listen for the 'webNavigation.onCompleted' event
chrome.webNavigation.onCompleted.addListener((details) => {
  // Log details of the completed navigation
  console.log("Navigation completed:", details);

  // Check if the navigation occurred in the main frame
  if (details.frameId === 0) { 
    // Execute the 'content.js' script in the context of the current tab
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content.js"]
    }, () => {
      // Check if there was an error during script execution
      if (chrome.runtime.lastError) {
        console.error("Script execution failed:", chrome.runtime.lastError.message);
      } else {
        console.log("Script executed successfully");
      }
    });
  }
// Only trigger the listener for URLs matching 'https://app.asana.com/*'
}, { url: [{ urlMatches: 'https://app.asana.com/*' }] });

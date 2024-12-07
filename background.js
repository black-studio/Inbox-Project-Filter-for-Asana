// Listen for the 'webNavigation.onCompleted' event
chrome.webNavigation.onCompleted.addListener((details) => {
  // Log details of the completed navigation
  console.log("Navigation completed:", details);

  // Check if the navigation occurred in the main frame
  if (details.frameId === 0) { 
    try {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ["content.js"]
      }).then(() => {
        console.log("Script executed successfully");
      }).catch((error) => {
        console.error("Script execution failed:", error);
      });
    } catch (error) {
      console.error("Error during script execution setup:", error);
    }
  }
// Only trigger the listener for URLs matching 'https://app.asana.com/*'
}, { url: [{ urlMatches: 'https://app.asana.com/*' }] });

/*

Clockwork
CART 351 Chrome Extension
p5 Overlay

You probably don't want to engage too deeply with the background
script unless you have something that needs it.

The basic functions here concern making the button work in the
browser to pause and unpause the extension, and giving the icon
a little badge to show whether the extension is on.

*/

function updateBadge(paused) {
  // This is an example of a really weird if statement syntax
  // I left it in from the template because it's good to encounter
  // at some point in your life.
  //
  // This one is the same as:
  //
  // if (paused) {
  //   badge_text = "X";
  // else {
  //   badge_text = "";
  // }

  badge_text = paused ? "X" : "";
  chrome.browserAction.setBadgeText({text: badge_text});
}

function setPaused(paused) {
  // Note that we're using something called "localStorage" here
  // which gives us the ability to save information in the browser
  // that will stay there between sessions.
  localStorage.setItem('paused', paused);
  updateBadge(paused);
}

// Set the extension to pause on install

chrome.runtime.onInstalled.addListener(function() {
  setPaused(true);
});

// If the extension's icon is clicked, toggle it

chrome.browserAction.onClicked.addListener(function(tab){
  state = localStorage.getItem('paused') == 'true'
  setPaused(!state);
  // Note that the page is reloaded when we start or stop the extension
  chrome.tabs.update(tab.id, {url: tab.url});
});

// Receive messages from the content script

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.name == "isPaused?") {
    sendResponse({value: localStorage.getItem('paused')});
  }
});

// Set the badge to be correct

updateBadge(localStorage.getItem('paused') == true);

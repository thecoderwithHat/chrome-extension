console.log('Background service worker (TS) started.'); 

let products = [];

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'addProduct') {
    const id = crypto.randomUUID();
    products.push({id, url: msg.url, selector: msg.selector, current: null, lowest: null});
    saveAndUpdate();
  }
  if (msg.action === 'removeProduct') {
    products = products.filter(p => p.id !== msg.id);
    saveAndUpdate();
  }
  if (msg.action === 'getProducts') {
    sendProducts();
  }
});

function saveAndUpdate() {
  chrome.storage.local.set({products});
  sendProducts();
}

function sendProducts() {
  chrome.runtime.sendMessage({action: 'updateProducts', products});
}

// Load products from storage on startup
chrome.storage.local.get(['products'], (data) => {
  if (data.products) products = data.products;
});

// Periodic price check every 10 minutes
setInterval(checkAllPrices, 10 * 60 * 1000);
// Also check on startup
checkAllPrices();

function checkAllPrices() {
  products.forEach((p, idx) => {
    // Find tab with URL or open new tab (in background)
    chrome.tabs.query({url: p.url}, (tabs) => {
      if (tabs.length > 0) {
        // Use existing tab
        injectAndExtract(tabs[0].id, p, idx);
      } else {
        // Open a new tab (in background)
        chrome.tabs.create({url: p.url, active: false}, (tab) => {
          // Wait for tab to load
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              injectAndExtract(tab.id, p, idx, true);
            }
          });
        });
      }
    });
  });
}

function injectAndExtract(tabId, product, idx, closeAfter = false) {
  chrome.scripting.executeScript({
    target: {tabId},
    files: ['content.js']
  }, () => {
    chrome.tabs.sendMessage(tabId, {action: 'extractPrice', selector: product.selector}, (response) => {
      if (response && typeof response.price === 'number') {
        products[idx].current = response.price;
        if (products[idx].lowest === null || response.price < products[idx].lowest) {
          products[idx].lowest = response.price;
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'New Lowest Price!',
            message: `Price dropped to $${response.price} for ${product.url}`
          });
        }
        saveAndUpdate();
      }
      if (closeAfter) {
        chrome.tabs.remove(tabId);
      }
    });
  });
} 
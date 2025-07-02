console.log('Content script (TS) injected.');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extractPrice') {
    let price = null;
    let selector = null;

    // Site-specific rules for Walmart
    if (location.hostname.includes('walmart.com')) {
      // Try main selector
      let el = document.querySelector('span[data-automation-id="product-price"]');
      if (el) {
        price = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
        selector = 'span[data-automation-id="product-price"]';
      } else {
        // Try split price
        let dollars = document.querySelector('span.price-characteristic');
        let cents = document.querySelector('span.price-mantissa');
        if (dollars && cents) {
          price = parseFloat(dollars.textContent.trim() + '.' + cents.textContent.trim());
          selector = 'span.price-characteristic + span.price-mantissa';
        } else {
          // Try alternate selector
          el = document.querySelector('span[data-testid="price"]');
          if (el) {
            price = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
            selector = 'span[data-testid="price"]';
          }
        }
      }
    } else {
      // Fallback: generic heuristic for other sites
      const keywords = ['price', 'amount', 'cost', 'prc', 'value'];
      const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
        const idClass = (el.id + ' ' + el.className).toLowerCase();
        return keywords.some(word => idClass.includes(word));
      });
      for (const el of candidates) {
        const text = el.textContent.replace(/\s+/g, '');
        if (/[$€£₹]\s?\d+[.,]?\d*/.test(text) || /\d+[.,]?\d*\s?(USD|EUR|INR|GBP)/i.test(text)) {
          price = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
          selector = el.id ? '#' + el.id : el.className ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase();
          break;
        }
      }
    }

    sendResponse({price, selector});
  }
  return true; // async response
});

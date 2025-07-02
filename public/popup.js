function renderProducts(products) {
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  products.forEach(p => {
    const li = document.createElement('li');
    li.className = 'product-item';
    li.textContent = `${p.url} | ${p.selector} | Current: ${p.current ?? '-'} | Lowest: ${p.lowest ?? '-'}`;
    const del = document.createElement('button');
    del.textContent = 'Remove';
    del.onclick = () => removeProduct(p.id);
    li.appendChild(del);
    list.appendChild(li);
  });
}

function addProduct() {
  const url = document.getElementById('url').value.trim();
  const selector = document.getElementById('selector').value.trim();
  if (!url || !selector) {
    document.getElementById('error').textContent = 'Both fields required!';
    return;
  }
  document.getElementById('error').textContent = '';
  chrome.runtime.sendMessage({action: 'addProduct', url, selector});
  document.getElementById('url').value = '';
  document.getElementById('selector').value = '';
}

function removeProduct(id) {
  chrome.runtime.sendMessage({action: 'removeProduct', id});
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'updateProducts') renderProducts(msg.products);
  if (msg.action === 'error') document.getElementById('error').textContent = msg.message;
});

document.getElementById('add').onclick = addProduct;

// On load, request product list
chrome.runtime.sendMessage({action: 'getProducts'}); 
export function startBTCPriceTracker(elementId) {
  const btcEl = document.getElementById(elementId);
  if (!btcEl) return;

  function updateBTCPrice() {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        const price = data.bitcoin.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        btcEl.textContent = `BTC: ${price}`;
      })
      .catch(() => {
        btcEl.textContent = 'BTC price unavailable';
      });
  }

  updateBTCPrice();
  setInterval(updateBTCPrice, 60000);
}

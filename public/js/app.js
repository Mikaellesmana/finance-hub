import { tvWidget } from './util.js';
import home from './pages/home.js';
import market from './pages/market.js';
import finance from './pages/finance.js';
import trade from './pages/trade.js';
import signals from './pages/signals.js';
import learn from './pages/learn.js';

const routes = { home, market, finance, trade, signals, learn };
const view = document.getElementById('view');
let cleanup = null;

function route() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const name = routes[path] ? path : 'home';
  const params = new URLSearchParams(query || '');

  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  if (typeof cleanup === 'function') cleanup();
  view.innerHTML = '';
  window.scrollTo(0, 0);
  cleanup = routes[name](view, params);
}

window.addEventListener('hashchange', route);
route();

tvWidget(document.getElementById('ticker-tape'), 'ticker-tape', {
  symbols: [
    { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
    { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
    { proName: 'IDX:COMPOSITE', title: 'IHSG' },
    { proName: 'FX_IDC:USDIDR', title: 'USD/IDR' },
    { proName: 'NASDAQ:NVDA', title: 'NVDA' },
    { proName: 'NASDAQ:AAPL', title: 'AAPL' },
    { proName: 'IDX:BBCA', title: 'BBCA' },
    { proName: 'IDX:BBRI', title: 'BBRI' },
    { proName: 'IDX:TLKM', title: 'TLKM' },
    { proName: 'TVC:GOLD', title: 'Gold' },
    { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
  ],
  showSymbolLogo: true, isTransparent: true, displayMode: 'adaptive', colorTheme: 'dark', locale: 'en',
});

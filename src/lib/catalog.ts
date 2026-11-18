/* =========================================================
   Catálogo y tipos
   ========================================================= */
export const TYPES = {
  stock: { l: 'Acción', p: 'Acciones', k: '--k-stock' },
  etf: { l: 'ETF', p: 'ETFs', k: '--k-etf' },
  fund: { l: 'Fondo', p: 'Fondos', k: '--k-fund' },
  crypto: { l: 'Cripto', p: 'Cripto', k: '--k-crypto' },
  other: { l: 'Otro', p: 'Otros', k: '--k-other' }
};
export const TYPE_ORDER = ['stock', 'etf', 'fund', 'crypto', 'other'];
export const typeOf = a => TYPES[a && a.type] ? a.type : 'other';
export const C = (symbol, name, type, currency, isin, exch) => ({ symbol, name, type, currency, isin, exch });
export const CATALOG = [
  C('IWDA.AS', 'iShares Core MSCI World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B4L5Y983', 'Ámsterdam'),
  C('EUNL.DE', 'iShares Core MSCI World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B4L5Y983', 'Xetra'),
  C('VWCE.DE', 'Vanguard FTSE All-World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00BK5BQT80', 'Xetra'),
  C('SXR8.DE', 'iShares Core S&P 500 UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B5BMR087', 'Xetra'),
  C('VUSA.AS', 'Vanguard S&P 500 UCITS ETF (Dist)', 'etf', 'EUR', 'IE00B3XXRP09', 'Ámsterdam'),
  C('EMIM.AS', 'iShares Core MSCI EM IMI UCITS ETF (Acc)', 'etf', 'EUR', 'IE00BKM4GZ66', 'Ámsterdam'),
  C('0P00000WLG.F', 'Vanguard Global Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE00B03HD191', 'Fondo'),
  C('', 'Fidelity MSCI World Index Fund P-ACC-EUR', 'fund', 'EUR', 'IE00BYX5NX33', 'Fondo'),
  C('', 'Vanguard U.S. 500 Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE0032126645', 'Fondo'),
  C('', 'Vanguard Emerging Markets Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE0031786696', 'Fondo'),
  C('', 'Amundi Index MSCI World AE-C', 'fund', 'EUR', 'LU0996182563', 'Fondo'),
  C('', 'iShares Developed World Index Fund (IE) D Acc EUR', 'fund', 'EUR', 'IE00BD0NCM55', 'Fondo'),
  C('AAPL', 'Apple', 'stock', 'USD', '', 'NASDAQ'),
  C('MSFT', 'Microsoft', 'stock', 'USD', '', 'NASDAQ'),
  C('NVDA', 'NVIDIA', 'stock', 'USD', '', 'NASDAQ'),
  C('AMZN', 'Amazon', 'stock', 'USD', '', 'NASDAQ'),
  C('GOOGL', 'Alphabet (clase A)', 'stock', 'USD', '', 'NASDAQ'),
  C('META', 'Meta Platforms', 'stock', 'USD', '', 'NASDAQ'),
  C('TSLA', 'Tesla', 'stock', 'USD', '', 'NASDAQ'),
  C('SAN.MC', 'Banco Santander', 'stock', 'EUR', '', 'Madrid'),
  C('BBVA.MC', 'BBVA', 'stock', 'EUR', '', 'Madrid'),
  C('ITX.MC', 'Inditex', 'stock', 'EUR', '', 'Madrid'),
  C('IBE.MC', 'Iberdrola', 'stock', 'EUR', '', 'Madrid'),
  C('TEF.MC', 'Telefónica', 'stock', 'EUR', '', 'Madrid'),
  C('REP.MC', 'Repsol', 'stock', 'EUR', '', 'Madrid'),
  C('BTC-EUR', 'Bitcoin', 'crypto', 'EUR', '', 'Cripto'),
  C('ETH-EUR', 'Ethereum', 'crypto', 'EUR', '', 'Cripto'),
  C('SOL-EUR', 'Solana', 'crypto', 'EUR', '', 'Cripto'),
  C('XRP-EUR', 'XRP', 'crypto', 'EUR', '', 'Cripto'),
  C('ADA-EUR', 'Cardano', 'crypto', 'EUR', '', 'Cripto')
];

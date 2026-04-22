/**
 * SettingsService — centralised, cached access to config_systeme.
 *
 * All services (payment, wallet, order) read platform settings through here.
 * The cache is invalidated whenever an admin calls updateConfig so changes
 * propagate within at most CACHE_TTL milliseconds (or immediately if the
 * admin just saved).
 */

const { query } = require('../config/database');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let _cache    = null;
let _cacheAt  = 0;

// ─── Internal loader ─────────────────────────────────────────────────────────

const _load = async () => {
  const rows = await query('SELECT cle, valeur, type FROM config_systeme');
  _cache   = {};
  _cacheAt = Date.now();

  for (const row of rows) {
    let v = row.valeur;
    if (row.type === 'number')  v = parseFloat(row.valeur);
    if (row.type === 'boolean') v = row.valeur === 'true';
    _cache[row.cle] = v;
  }
  return _cache;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Return the full settings map (from cache or DB). */
const getAll = async () => {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  return _load();
};

/**
 * Return a single setting value.
 * @param {string} key
 * @param {*} defaultVal – returned when key is absent
 */
const get = async (key, defaultVal = null) => {
  const all = await getAll();
  return key in all ? all[key] : defaultVal;
};

/** Force cache invalidation — call after any admin config update. */
const invalidate = () => {
  _cache   = null;
  _cacheAt = 0;
};

module.exports = { getAll, get, invalidate };

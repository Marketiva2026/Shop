const crypto = require('crypto');

const genReference = (prefix = 'MKV') => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
};

const genCodeParrainage = (nomComplet) => {
  const base = nomComplet.replace(/\s+/g, '').substring(0, 5).toUpperCase();
  const num = crypto.randomInt(1000, 9999);
  return `${base}${num}`;
};

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const genCodeRetrait = () =>
  crypto.randomInt(100000, 999999).toString();

const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
};

const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { offset: (p - 1) * l, limit: l, page: p };
};

module.exports = {
  genReference,
  genCodeParrainage,
  slugify,
  genCodeRetrait,
  sanitizeHtml,
  paginate,
};

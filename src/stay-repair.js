(() => {
  'use strict';
  const fields = ['role', 'name', 'address', 'phone', 'note', 'url'];
  const value = (stay, field) => typeof stay?.[field] === 'string' ? stay[field].trim() : '';
  const isSala = stay => value(stay, 'name').normalize('NFKC').replace(/\s+/g, ' ').toLowerCase() === 'sala danang beach hotel';
  function isMapsURL(text) {
    try {
      const url = new URL(text);
      if (!['https:', 'http:'].includes(url.protocol)) return false;
      const host = url.hostname.toLowerCase();
      if (host === 'maps.app.goo.gl') return true;
      if (host === 'goo.gl') return /^\/maps(?:\/|$)/.test(url.pathname);
      const google = /^(?:www\.|maps\.)?google\.(?:com|co\.jp|co\.uk|com\.hk|com\.vn)$/.test(host);
      return google && (host.startsWith('maps.') || /^\/maps(?:\/|$)/.test(url.pathname));
    } catch { return false; }
  }
  function fragment(stay, hadContinuation) {
    if (!stay || typeof stay !== 'object' || fields.some(field => typeof stay[field] !== 'string')) return null;
    if (['address', 'phone', 'note', 'url'].some(field => value(stay, field))) return null;
    const role = value(stay, 'role'), name = value(stay, 'name');
    if (/^チェック(?:イン|アウト)(?=\s|[:：]|$)/.test(role) && (!name || isMapsURL(name))) return { note: role, url: name };
    if (hadContinuation && !name && isMapsURL(role)) return { note: '', url: role };
    return null;
  }
  function appendNote(note, line) {
    if (!line || String(note || '').split(/\r?\n/).some(existing => existing.trim() === line)) return note;
    return note ? note + (/[\r\n]$/.test(note) ? '' : '\n') + line : line;
  }
  function repairContinuations(stays) {
    if (!Array.isArray(stays)) return [];
    const output = [];
    for (let index = 0; index < stays.length; index++) {
      const source = stays[index];
      const stay = source && typeof source === 'object' ? { ...source } : source;
      output.push(stay);
      if (!isSala(stay)) continue;
      let hadContinuation = false;
      while (index + 1 < stays.length) {
        const next = fragment(stays[index + 1], hadContinuation);
        if (!next) break;
        stay.note = appendNote(stay.note, next.note);
        if (next.url && !value(stay, 'url')) stay.url = next.url;
        hadContinuation = true;
        index++;
      }
    }
    return output;
  }
  globalThis.DaNangStayRepair = { repairContinuations };
})();

'use strict';
// Per-member rules code: the bot shows an entry code, the rules page (Cloudflare Function)
// turns it into a confirmation code with the shared RULES_SECRET, the member types it back.
const { createHmac } = require('node:crypto');
const { randomInt } = require('node:crypto');
const { C } = require('./constants');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // same as the CAPTCHA alphabet
const clean = v => (typeof v === 'string' ? v.toUpperCase().replace(/[\s-]/g, '') : '');
function generateEntry(length = C.RULES_ENTRY_LENGTH) { let out = ''; for (let n = 0; n < length; n++) out += ALPHABET[randomInt(ALPHABET.length)]; return out; }
function confirmationFor(secret, entry, length = C.RULES_CONFIRM_LENGTH) {
  const mac = createHmac('sha256', secret).update('pl-rules-v1:' + clean(entry)).digest();
  let out = ''; for (let n = 0; n < length; n++) out += ALPHABET[mac[n] % ALPHABET.length];
  return out;
}
const pretty = code => code.slice(0, Math.ceil(code.length / 2)) + '-' + code.slice(Math.ceil(code.length / 2));
module.exports = { ALPHABET, clean, generateEntry, confirmationFor, pretty };

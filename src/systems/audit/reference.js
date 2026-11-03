'use strict';
const { randomBytes } = require('node:crypto');
const { referenceId, snowflake } = require('../../utils/validators');
const { C } = require('../../utils/constants');
// Only in-flight operation allocations are held; completed records live in Discord alone.
const allocated = new Set();
const FOOTER = 'MAHARLIKA_SECURITY:verification_success:v1';
function generateReference(now = new Date()) {
  if (allocated.size >= C.MAX_REFERENCES) throw new Error('Reference allocation is busy');
  for (let attempt = 0; attempt < 32; attempt++) {
    const id = 'MH-' + now.getUTCFullYear() + '-' + randomBytes(3).toString('hex').toUpperCase();
    if (!allocated.has(id)) { allocated.add(id); return id; }
  }
  throw new Error('Reference allocation failed');
}
function releaseReference(reference) { allocated.delete(reference); }
function parseRecord(message, botId) {
  if (message.author?.id !== botId || message.webhookId) return null;
  for (const embed of message.embeds || []) {
    if (embed.footer?.text !== FOOTER || embed.title !== 'Verification successful') continue;
    const fields = embed.fields || [];
    const get = name => { const found = fields.filter(f => f.name === name); return found.length === 1 ? found[0].value : null; };
    const ref = get('Verification Reference'), userId = get('Discord user ID');
    if (!referenceId(ref) || !snowflake(userId) || get('CAPTCHA') !== 'Passed' || get('Rules') !== 'Accepted' || get('Member role assignment') !== 'Successful') continue;
    return { reference: ref, userId, embed, messageId: message.id, url: message.url };
  }
  return null;
}
function exactReference(message, botId, reference) { const record = parseRecord(message, botId); return record && record.reference === reference ? record : null; }
module.exports = { generateReference, releaseReference, parseRecord, exactReference, FOOTER };

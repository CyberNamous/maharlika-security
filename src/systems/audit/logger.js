'use strict';
const { PublicError } = require('../../utils/errors');
const { EmbedBuilder } = require('discord.js');
const { textChannel } = require('../../utils/permissions');
const { NO_MENTIONS } = require('../../utils/embeds');
const { safeError, accountDays } = require('../../utils/validators');
const { FOOTER, parseRecord } = require('./reference');
const { C } = require('../../utils/constants');
const EVENT_FOOTER = 'MAHARLIKA_SECURITY:event:v1';
function logFailure(label, error) { console.error('[security] ' + label + ' (' + safeError(error) + ')'); }
async function sendStaff(guild, ctx, key, data) {
  const ch = await textChannel(guild, ctx.env[key], false, true);
  return ch.send({ ...data, allowedMentions: NO_MENTIONS });
}
async function event(guild, ctx, title, { actor, target, detail = '', color = 0xe2a03f } = {}) {
  const e = new EmbedBuilder().setTitle(title.slice(0, 200)).setColor(color).setTimestamp().setFooter({ text: EVENT_FOOTER });
  if (actor) e.addFields({ name: 'Staff actor ID', value: actor });
  if (target) e.addFields({ name: 'Discord user ID', value: target });
  if (detail) e.setDescription(detail.slice(0, 3500));
  try { return await sendStaff(guild, ctx, 'AUDIT_CHANNEL_ID', { embeds: [e] }); }
  catch (error) { logFailure('Audit delivery failed: ' + title, error); return null; }
}
async function alert(guild, ctx, title, detail) {
  try { return await sendStaff(guild, ctx, 'SECURITY_ALERT_CHANNEL_ID', { embeds: [new EmbedBuilder().setTitle(title).setDescription(detail.slice(0, 3500)).setColor(0xdb4b47).setTimestamp().setFooter({ text: EVENT_FOOTER })] }); }
  catch (error) { logFailure('Staff alert delivery failed', error); return null; }
}
function successEmbed(user, reference, now = Date.now()) {
  return new EmbedBuilder().setTitle('Verification successful').setColor(0x2e9c69).setFooter({ text: FOOTER }).setTimestamp(now).addFields(
    { name: 'Verification Reference', value: reference },
    { name: 'Member', value: '<@' + user.id + '>' },
    { name: 'Member username', value: user.username.slice(0, 100) },
    { name: 'Discord user ID', value: user.id },
    { name: 'Account creation date', value: new Date(user.createdTimestamp).toISOString() },
    { name: 'Account age at verification', value: accountDays(user.createdTimestamp, now) + ' complete days' },
    { name: 'CAPTCHA', value: 'Passed', inline: true }, { name: 'Rules', value: 'Accepted', inline: true },
    { name: 'Member role assignment', value: 'Successful' },
    { name: 'Verification timestamp', value: new Date(now).toISOString() }
  );
}
async function success(guild, ctx, user, reference, nonce) {
  const e = successEmbed(user, reference);
  try {
    // Stable Discord nonce protects near-term retries; we never blindly retry ambiguous POSTs.
    const msg = await sendStaff(guild, ctx, 'AUDIT_CHANNEL_ID', { embeds: [e], nonce, enforceNonce: true });
    e.addFields({ name: 'Audit message ID', value: msg.id });
    try { await msg.edit({ embeds: [e], allowedMentions: NO_MENTIONS }); }
    catch (error) { logFailure('Audit saved, secondary locator edit failed; use message permalink', error); }
    return msg;
  } catch (error) {
    logFailure('Successful roles but audit delivery not confirmed', error);
    await alert(guild, ctx, 'Audit delivery not confirmed', 'User ID: ' + user.id + '\nReference: ' + reference + '\nMember role was assigned. Inspect the audit channel before manually recording this outcome; a network timeout can be ambiguous.');
    return null;
  }
}
function isEvent(message, botId) { return message.author?.id === botId && !message.webhookId && message.embeds?.some(e => e.footer?.text === EVENT_FOOTER); }
async function history(guild, ctx, visitor, limit = C.HISTORY_LIMIT) {
  if (!Number.isInteger(limit) || limit < 1) throw new PublicError('Invalid audit search limit.');
  limit = Math.min(limit, C.HISTORY_LIMIT);
  if (ctx.historyActive >= C.MAX_HISTORY_OPERATIONS) throw new PublicError('Audit search is busy. Try again shortly.');
  ctx.historyActive++;
  let scanned = 0, before, stopped = false;
  try {
    const ch = await textChannel(guild, ctx.env.AUDIT_CHANNEL_ID, true, true);
    while (scanned < limit && !stopped) {
      const requested = Math.min(C.PAGE_SIZE, limit - scanned);
      const page = await ch.messages.fetch({ limit: requested, ...(before ? { before } : {}), cache: false });
      if (!page.size) break;
      for (const message of page.values()) { scanned++; if (visitor(message) === false) { stopped = true; break; } }
      before = page.last().id;
      if (page.size < requested) break;
    }
    return scanned;
  } finally { ctx.historyActive--; }
}
module.exports = { event, alert, success, successEmbed, history, isEvent, parseRecord, logFailure, EVENT_FOOTER };

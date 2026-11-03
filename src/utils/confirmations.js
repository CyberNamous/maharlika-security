'use strict';
const { PublicError } = require('./errors');
const { randomBytes } = require('node:crypto');
const { ButtonStyle } = require('discord.js');
const { C } = require('./constants');
const { authorize, managedRoles, targetMember } = require('./permissions');
const { buttons, privateReply } = require('./embeds');
const audit = require('../systems/audit/logger');
function prune(ctx) { for (const [key, data] of ctx.confirmations) if (data.expires <= Date.now()) ctx.confirmations.delete(key); }
async function request(i, ctx, action, { target = '', reason = '' } = {}) {
  prune(ctx);
  if (ctx.confirmations.size >= C.MAX_CONFIRMATIONS) throw new PublicError('Too many pending confirmations. Try again shortly.');
  const id = randomBytes(12).toString('hex');
  ctx.confirmations.set(id, { action, target, reason: reason.slice(0, 300), actor: i.user.id, guild: i.guildId, expires: Date.now() + C.CONFIRM_SECONDS * 1000 });
  const text = action === 'reset' ? 'Reset current roles for user ID ' + target + '? This does not delete historical audit records.' : action === 'lockdown' ? 'Pause new verification and final acceptance? No channel overwrites will be changed.' : 'Enable verification? No channel overwrites need restoration. After a restart, inspect server permissions before continuing.';
  return privateReply(i, { content: text + '\nConfirmation expires in ' + C.CONFIRM_SECONDS + ' seconds.', components: [buttons([['mh:confirm:' + id, 'Confirm', ButtonStyle.Danger], ['mh:cancel:' + id, 'Cancel', ButtonStyle.Secondary]])] });
}
async function handle(i, ctx) {
  const match = /^mh:(confirm|cancel):([a-f0-9]{24})$/.exec(i.customId);
  if (!match || !i.isButton()) throw new PublicError('Invalid confirmation action.');
  prune(ctx); const data = ctx.confirmations.get(match[2]);
  if (!data || data.actor !== i.user.id || data.guild !== i.guildId) throw new PublicError('This confirmation has expired or does not belong to you.');
  authorize(i, ctx, 'manager');
  ctx.confirmations.delete(match[2]); // consume before awaiting, including double-clicks
  if (match[1] === 'cancel') return i.update({ content: 'Action cancelled.', components: [] });
  await i.deferUpdate();
  if (data.action !== 'reset') {
    const result = await ctx.lockdown.set(data.action === 'lockdown', i.guild, ctx, i.user.id);
    return privateReply(i, { content: (result.changed ? 'Lockdown state updated.' : 'Lockdown already has the requested state.') + (result.audited ? '' : ' Audit delivery failed; inspect console and alert channel.'), components: [] });
  }
  if (ctx.userLocks.has(data.target) && data.target !== i.user.id) throw new PublicError('That member has an action in progress. Retry shortly.');
  const ownLock = data.target !== i.user.id;
  if (ownLock) ctx.userLocks.add(data.target);
  let changed = false;
  try {
    const member = await targetMember(i.guild, data.target);
    if (member.id === ctx.client.user.id || member.user.bot) throw new PublicError('Reset is intended for human members only.');
    await managedRoles(i.guild, ctx.env);
    ctx.sessions.delete(i.guildId, data.target);
    // Restore restrictions first; use per-role endpoints to preserve unrelated roles.
    if (!member.roles.cache.has(ctx.env.UNVERIFIED_ROLE_ID)) { changed = true; await member.roles.add(ctx.env.UNVERIFIED_ROLE_ID, 'Verification reset requested by staff'); }
    if (member.roles.cache.has(ctx.env.MEMBER_ROLE_ID)) { changed = true; await member.roles.remove(ctx.env.MEMBER_ROLE_ID, 'Verification reset requested by staff'); }
    const record = await audit.event(i.guild, ctx, 'Verification reset', { actor: i.user.id, target: data.target, detail: 'Current roles reset; historical records retained. Reason: ' + (data.reason || 'Not provided') });
    return privateReply(i, { content: 'Current roles reset. Historical audit records were not deleted.' + (record ? '' : ' Audit delivery failed; notify staff.'), components: [] });
  } catch (error) {
    await audit.event(i.guild, ctx, 'Verification reset failed', { actor: i.user.id, target: data.target, detail: changed ? 'Partial role change. Inspect current roles manually.' : 'Role change not confirmed. Inspect role hierarchy and permissions.' });
    if (changed) await audit.alert(i.guild, ctx, 'Partial reset: inspect roles', 'User ID: ' + data.target);
    throw error;
  } finally { if (ownLock) ctx.userLocks.delete(data.target); }
}
module.exports = { request, handle, prune };

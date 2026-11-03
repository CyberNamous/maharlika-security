'use strict';
const { PublicError } = require('../../utils/errors');
const { ModalBuilder, ActionRowBuilder, ButtonBuilder, TextInputBuilder, TextInputStyle, MessageFlags, ButtonStyle } = require('discord.js');
const { C } = require('../../utils/constants');
const { accountOldEnough } = require('../../utils/validators');
const { requireGuild, managedRoles, targetMember, textChannel } = require('../../utils/permissions');
const { embed, buttons, privateReply, NO_MENTIONS } = require('../../utils/embeds');
const rulesCode = require('../../utils/rulesCode');
const captcha = require('./captcha');
const audit = require('../audit/logger');
const { generateReference, releaseReference } = require('../audit/reference');
function assertAvailable(ctx) { if (ctx.lockdown.active) throw new PublicError('Verification is temporarily paused by staff. Please try again after it is unlocked.'); }
function rulesPayload(s, entry) {
  if (entry) {
    const text = C.RULES_SUMMARY + '\n\n**Your personal entry code:** `' + rulesCode.pretty(entry) + '`\n\n1. Press Open Rules Page and read the rules.\n2. On the page, type your entry code, tick the box and press Acknowledge & Continue.\n3. Come back here, press Enter Confirmation Code and type the code the page shows you.\n\nThis code belongs to you only. Do not share it.';
    const link = new ButtonBuilder().setLabel('Open Rules Page').setStyle(ButtonStyle.Link).setURL(C.RULES_URL);
    const row = buttons([['mh:ropen:' + s.id, 'Enter Confirmation Code', ButtonStyle.Success], ['mh:decline:' + s.id, 'Decline', ButtonStyle.Secondary]]);
    row.components.unshift(link);
    return { content: '', embeds: [embed('Stage 3: Rules acknowledgement', text)], components: [row] };
  }
  return { content: '', embeds: [embed('Stage 3: Rules acceptance', C.RULES_SUMMARY + (C.RULES_URL ? '\n\nRules: ' + C.RULES_URL : '') + '\n\nBy selecting I Agree, you explicitly accept these rules.')], components: [buttons([
    ['mh:agree:' + s.id, 'I Agree', ButtonStyle.Success], ['mh:decline:' + s.id, 'Decline', ButtonStyle.Secondary]
  ])] };
}
async function begin(i, ctx) {
  requireGuild(i, ctx); assertAvailable(ctx);
  // The public panel is not a session token: it is accepted only in the configured channel.
  if (i.channelId !== ctx.env.VERIFICATION_CHANNEL_ID || i.message?.author?.id !== ctx.client.user.id) throw new PublicError('Use the current verification panel in the configured channel.');
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  ctx.sessions.prune();
  if (ctx.sessions.cooldowns.has(ctx.sessions.key(i.guildId, i.user.id))) throw new PublicError('Please wait before starting another verification.');
  if (ctx.sessions.items.size >= C.MAX_SESSIONS && !ctx.sessions.items.has(ctx.sessions.key(i.guildId, i.user.id))) throw new PublicError('Verification is busy. Please try again shortly.');
  const member = await targetMember(i.guild, i.user.id);
  if (member.user.bot) throw new PublicError('Bot accounts cannot use this checkpoint.');
  if (member.roles.cache.has(ctx.env.MEMBER_ROLE_ID)) return privateReply(i, 'You already have the Member role.');
  if (!accountOldEnough(i.user.createdTimestamp)) {
    await privateReply(i, 'Your Discord account must be at least ' + C.MIN_ACCOUNT_AGE_DAYS + ' complete days old. You have not been banned.');
    // Use the bounded start limiter even for repeated under-age attempts.
    const previous = ctx.sessions.cooldowns.get(ctx.sessions.key(i.guildId, i.user.id)) || 0;
    ctx.sessions.prune();
    if (previous <= Date.now() && ctx.sessions.cooldowns.size < C.MAX_COOLDOWNS) {
      ctx.sessions.cooldowns.set(ctx.sessions.key(i.guildId, i.user.id), Date.now() + C.START_COOLDOWN_SECONDS * 1000);
      await audit.event(i.guild, ctx, 'Account too young', { target: i.user.id, detail: 'Minimum account age: ' + C.MIN_ACCOUNT_AGE_DAYS + ' complete days.' });
    }
    return;
  }
  await managedRoles(i.guild, ctx.env);
  // Refuse verification when the staff audit destination is unusable or public.
  await textChannel(i.guild, ctx.env.AUDIT_CHANNEL_ID, false, true);
  assertAvailable(ctx);
  const answer = captcha.generate();
  const s = ctx.sessions.create(i.guildId, i.user.id, answer);
  return privateReply(i, { embeds: [embed('Stage 2: Typed CAPTCHA', 'Stage 1 passed. Type this code in the answer modal:\n\n**' + answer + '**\n\nExpires ' + C.CAPTCHA_EXPIRY_SECONDS + ' seconds after this challenge was issued; up to ' + C.CAPTCHA_MAX_ATTEMPTS + ' attempts. This text check is not strong anti-automation protection.')], components: [buttons([['mh:open:' + s.id, 'Enter CAPTCHA']])] });
}
async function open(i, ctx, id) {
  assertAvailable(ctx); ctx.sessions.get(i.guildId, i.user.id, id, 'captcha');
  const input = new TextInputBuilder().setCustomId('answer').setLabel('CAPTCHA answer').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(32);
  return i.showModal(new ModalBuilder().setCustomId('mh:answer:' + id).setTitle('MAHARLIKA Security').addComponents(new ActionRowBuilder().addComponents(input)));
}
async function answer(i, ctx, id) {
  assertAvailable(ctx);
  // Validate the session synchronously before consuming input or awaiting any API request.
  let result;
  try { result = ctx.sessions.answer(i.guildId, i.user.id, id, i.fields.getTextInputValue('answer')); }
  catch (error) {
    if (!(error instanceof PublicError)) throw error;
    await privateReply(i, error.message);
    if (error.message.startsWith('Verification expired')) await audit.event(i.guild, ctx, 'CAPTCHA expired', { target: i.user.id });
    return;
  }
  if (result.passed) {
    let entry;
    if (ctx.env.RULES_SECRET) {
      entry = rulesCode.generateEntry();
      result.session.rulesHash = captcha.digest(rulesCode.confirmationFor(ctx.env.RULES_SECRET, entry));
      result.session.rulesAttempts = 0;
    }
    return privateReply(i, rulesPayload(result.session, entry));
  }
  await privateReply(i, { content: result.remaining ? 'Incorrect answer. ' + result.remaining + ' attempts remain. Use Enter CAPTCHA again on your private challenge.' : 'CAPTCHA attempts exhausted. Begin verification again after the cooldown.', components: [] });
  if (!result.remaining) await audit.event(i.guild, ctx, 'CAPTCHA attempts exhausted', { target: i.user.id });
}
async function complete(i, ctx, id, claimed = false) {
  assertAvailable(ctx);
  if (!claimed) ctx.sessions.claim(i.guildId, i.user.id, id); // synchronous single-use claim
  let member, reference, attemptedAdd = false, attemptedRemove = false, success = false;
  try {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    member = await targetMember(i.guild, i.user.id);
    if (member.roles.cache.has(ctx.env.MEMBER_ROLE_ID)) { await privateReply(i, 'You already have the Member role.'); return; }
    if (!accountOldEnough(member.user.createdTimestamp)) throw new PublicError('Your account does not meet the minimum age.');
    await managedRoles(i.guild, ctx.env);
    await textChannel(i.guild, ctx.env.AUDIT_CHANNEL_ID, false, true);
    assertAvailable(ctx);
    reference = generateReference();
    attemptedAdd = true;
    await member.roles.add(ctx.env.MEMBER_ROLE_ID, 'Completed account age, CAPTCHA and explicit rules acceptance');
    if (member.roles.cache.has(ctx.env.UNVERIFIED_ROLE_ID)) { attemptedRemove = true; await member.roles.remove(ctx.env.UNVERIFIED_ROLE_ID, 'Verification completed'); }
    assertAvailable(ctx);
    success = true;
  } catch (error) {
    let rollbackFailed = false;
    if (attemptedAdd && !success) {
      // Restore the restrictive role before taking away the newly granted role.
      if (attemptedRemove) { try { await member.roles.add(ctx.env.UNVERIFIED_ROLE_ID, 'Verification rollback'); } catch (e) { rollbackFailed = true; audit.logFailure('Rollback restore Unverified failed', e); } }
      try { await member.roles.remove(ctx.env.MEMBER_ROLE_ID, 'Verification rollback'); } catch (e) { rollbackFailed = true; audit.logFailure('Rollback remove Member failed', e); }
    }
    await audit.event(i.guild, ctx, 'Role assignment failed', { target: i.user.id, detail: rollbackFailed ? 'Partial role change; rollback failed. Staff must inspect current roles immediately.' : 'Verification not completed. Inspect permissions, role hierarchy and lockdown state.' });
    if (rollbackFailed) await audit.alert(i.guild, ctx, 'Role rollback requires staff inspection', 'User ID: ' + i.user.id + '. Check Member and Unverified roles now.');
    audit.logFailure('Verification completion failed', error);
    await privateReply(i, 'Verification could not be completed. Staff have been notified when possible; please contact staff before retrying.');
    return;
  } finally {
    ctx.sessions.delete(i.guildId, i.user.id);
    if (!success && reference) releaseReference(reference);
  }
  // Roles are committed. Never retry role assignment or duplicate a success on this session.
  const nonce = i.id;
  let record;
  try { record = await audit.success(i.guild, ctx, member.user, reference, nonce); }
  finally { releaseReference(reference); }
  try {
    const checks = await textChannel(i.guild, ctx.env.CHECKS_CHANNEL_ID);
    await checks.send({ content: '<@' + i.user.id + '> has successfully passed the checkpoint', allowedMentions: NO_MENTIONS, nonce: nonce + '1', enforceNonce: true });
  } catch (error) {
    audit.logFailure('Checks announcement failed', error);
    await audit.event(i.guild, ctx, 'Checks announcement failed', { target: i.user.id, detail: 'Member role assigned. Public success announcement delivery not confirmed.' });
  }
  await privateReply(i, { content: 'Your verification was successful. Welcome to the community!', components: [] });
  if (!record) console.error('[security] Audit delivery was NOT confirmed; see staff alert and inspect Discord.');
}
async function openRulesCode(i, ctx, id) {
  assertAvailable(ctx); ctx.sessions.get(i.guildId, i.user.id, id, 'rules');
  const input = new TextInputBuilder().setCustomId('rcode').setLabel('Confirmation code from the rules page').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(32);
  return i.showModal(new ModalBuilder().setCustomId('mh:rsubmit:' + id).setTitle('MAHARLIKA Security').addComponents(new ActionRowBuilder().addComponents(input)));
}
async function submitRulesCode(i, ctx, id) {
  assertAvailable(ctx);
  let result;
  try { result = ctx.sessions.confirmRules(i.guildId, i.user.id, id, rulesCode.clean(i.fields.getTextInputValue('rcode'))); }
  catch (error) { if (!(error instanceof PublicError)) throw error; return privateReply(i, error.message); }
  if (result.passed) return complete(i, ctx, id, true);
  await privateReply(i, result.remaining ? 'Incorrect code. ' + result.remaining + ' attempts remain. Check the code on the rules page and use Enter Confirmation Code again.' : 'Too many incorrect codes. Begin verification again after the cooldown.');
  if (!result.remaining) await audit.event(i.guild, ctx, 'Rules code attempts exhausted', { target: i.user.id });
}
async function component(i, ctx) {
  requireGuild(i, ctx);
  if (i.isButton() && i.customId === 'mh:begin') return begin(i, ctx);
  const match = /^mh:(open|answer|agree|decline|ropen|rsubmit):([a-f0-9]{24})$/.exec(i.customId);
  if (!match) throw new PublicError('Unknown or outdated checkpoint action. Begin verification again.');
  const [, action, id] = match;
  if ((action === 'answer' || action === 'rsubmit') !== i.isModalSubmit()) throw new PublicError('Invalid checkpoint interaction type.');
  if (action === 'open') return open(i, ctx, id);
  if (action === 'answer') return answer(i, ctx, id);
  if (action === 'ropen') return openRulesCode(i, ctx, id);
  if (action === 'rsubmit') return submitRulesCode(i, ctx, id);
  if (action === 'agree') return complete(i, ctx, id);
  ctx.sessions.get(i.guildId, i.user.id, id, 'rules'); ctx.sessions.delete(i.guildId, i.user.id);
  return privateReply(i, { content: 'Rules were not accepted. You remain unverified.', components: [] });
}
module.exports = { component, begin, complete, rulesPayload };

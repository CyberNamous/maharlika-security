'use strict';
const { Events, MessageFlags } = require('discord.js');
const { C } = require('../utils/constants');
const { PublicError } = require('../utils/errors');
const { requireGuild, authorize } = require('../utils/permissions');
const { privateReply } = require('../utils/embeds');
const checkpoint = require('../systems/verification/checkpoint');
const confirmation = require('../utils/confirmations');
const { logFailure } = require('../systems/audit/logger');
async function dispatch(i, ctx) {
  requireGuild(i, ctx);
  if (i.isChatInputCommand()) {
    const command = ctx.commands.get(i.commandName + ':' + i.options.getSubcommand());
    if (!command) throw new PublicError('Unknown command. Ask the bot owner to run npm run deploy.');
    authorize(i, ctx, command.level);
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    return command.execute(i, ctx);
  }
  if (i.customId?.startsWith('mh:confirm:') || i.customId?.startsWith('mh:cancel:')) return confirmation.handle(i, ctx);
  return checkpoint.component(i, ctx);
}
module.exports = { name: Events.InteractionCreate,
  async execute(i, ctx) {
    if (!i.isChatInputCommand() && !i.isButton() && !i.isModalSubmit()) return;
    if (ctx.stopping) return;
    if (ctx.activeInteractions >= C.MAX_ACTIVE_INTERACTIONS || ctx.userLocks.has(i.user.id)) {
      // Never create an unbounded queue just to report that the main queue is full.
      if ((ctx.busyResponses || 0) >= C.MAX_BUSY_RESPONSES) return;
      ctx.busyResponses = (ctx.busyResponses || 0) + 1;
      try { await privateReply(i, 'An action is already in progress or the bot is busy. Try again shortly.'); }
      catch { /* expired or rate-limited interaction */ }
      finally { ctx.busyResponses--; }
      return;
    }
    ctx.activeInteractions++; ctx.userLocks.add(i.user.id);
    try { await dispatch(i, ctx); }
    catch (error) {
      if (error.code === 10062 || error.code === 40060) return; // expired/acknowledged; no retry storm
      if (!(error instanceof PublicError)) logFailure('Interaction failed', error);
      const message = error instanceof PublicError ? error.message : 'The action could not be completed. Check server setup, permissions and role hierarchy, or contact staff. Staff can inspect diagnostics and console logs.';
      try { await privateReply(i, { content: message, components: [] }); }
      catch (replyError) { if (![10062, 40060, 10008].includes(replyError.code)) logFailure('Interaction error response unavailable', replyError); }
    } finally { ctx.userLocks.delete(i.user.id); ctx.activeInteractions--; }
  }, dispatch
};

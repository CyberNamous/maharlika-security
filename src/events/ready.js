'use strict';
const { Events } = require('discord.js');
const { diagnostics } = require('../utils/permissions');
const audit = require('../systems/audit/logger');
module.exports = { name: Events.ClientReady, once: true,
  async execute(client, ctx) {
    console.log('[startup] MAHARLIKA Security ready; ' + ctx.commands.size + ' subcommands, ' + ctx.eventCount + ' events. Verification starts PAUSED.');
    if (client.user.id !== ctx.env.CLIENT_ID) { console.error('[startup] CLIENT_ID does not match the logged-in bot.'); await ctx.shutdown(1); return; }
    const guild = client.guilds.cache.get(ctx.env.GUILD_ID);
    if (!guild) { console.error('[startup] Configured server unavailable. Reinvite the correct application.'); await ctx.shutdown(1); return; }
    // Do not download member lists or audit history. Startup validation checks only configured resources.
    const checks = await diagnostics(guild, ctx);
    for (const message of checks) if (!message.endsWith(': OK')) console.error('[setup] ' + message);
    await audit.alert(guild, ctx, 'Security bot restarted: verification paused', 'Active CAPTCHA sessions were lost. Review /admin setup and channel/role permissions, then use confirmed /security unlock. No permission overwrites were changed by this bot.');
  }
};

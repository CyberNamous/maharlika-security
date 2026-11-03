'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { privateReply } = require('../../utils/embeds');
const { C } = require('../../utils/constants');
module.exports = { group: 'security', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('status').setDescription('Gateway, verification pause and event monitor status'),
  async execute(i, ctx) {
    ctx.sessions.prune();
    return privateReply(i, 'Gateway ready: ' + ctx.client.isReady() + '\nVerification lockdown: ' + ctx.lockdown.active + '\nMode: verification pause; no channel overwrites\nState set by: ' + ctx.lockdown.actor + '\nSince: ' + new Date(ctx.lockdown.since).toISOString() + '\nJoin monitor: event-driven, since this process started\nAlert threshold: ' + C.RAID_JOIN_THRESHOLD + ' joins / ' + C.RAID_JOIN_WINDOW_SECONDS + ' seconds\nAlert cooldown: ' + C.RAID_ALERT_COOLDOWN_SECONDS + ' seconds\nActive sessions: ' + ctx.sessions.items.size + '/' + C.MAX_SESSIONS);
  }
};

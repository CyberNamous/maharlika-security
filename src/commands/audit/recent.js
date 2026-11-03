'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { history, parseRecord, isEvent } = require('../../systems/audit/logger');
const { privateReply } = require('../../utils/embeds');
const { C } = require('../../utils/constants');
module.exports = { group: 'audit', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('recent').setDescription('Bounded recent bot security and verification audit messages'),
  async execute(i, ctx) { const rows = []; const scanned = await history(i.guild, ctx, m => { if (parseRecord(m, ctx.client.user.id) || isEvent(m, ctx.client.user.id)) rows.push((m.embeds[0]?.title || 'Security event') + ': ' + m.url); return rows.length < C.RECENT_LIMIT; }); return privateReply(i, (rows.join('\n') || 'No bot records found.') + '\nSearched ' + scanned + ' messages.'); }
};

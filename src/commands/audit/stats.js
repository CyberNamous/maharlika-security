'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { history, parseRecord, isEvent } = require('../../systems/audit/logger');
const { privateReply } = require('../../utils/embeds');
module.exports = { group: 'audit', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('stats').setDescription('Statistics limited to the searched Discord message range'),
  async execute(i, ctx) { let successes = 0, events = 0; const scanned = await history(i.guild, ctx, m => { if (parseRecord(m, ctx.client.user.id)) successes++; else if (isEvent(m, ctx.client.user.id)) events++; }); return privateReply(i, 'Searched-range statistics (NOT lifetime totals)\nMessages searched: ' + scanned + '\nSuccessful verification records: ' + successes + '\nOther bot security events: ' + events + '\nDeleted and older records are not counted.'); }
};

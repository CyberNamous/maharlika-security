'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { privateReply } = require('../../utils/embeds');
const { C } = require('../../utils/constants');
module.exports = { group: 'security', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('scan').setDescription('Inspect only the retained in-memory join window'),
  async execute(i, ctx) { const s = ctx.joins.snapshot(); return privateReply(i, s.risk + '\nRetained joins: ' + s.count + (s.capped ? '+ (storage cap reached; lower bound)' : '') + '\nAccounts under ' + C.MIN_ACCOUNT_AGE_DAYS + ' days: ' + s.young + '\nWindow: ' + C.RAID_JOIN_WINDOW_SECONDS + ' seconds, current process only. No historical member scan. New accounts alone do not indicate malicious intent.'); }
};

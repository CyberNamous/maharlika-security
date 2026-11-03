'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { history, parseRecord, isEvent } = require('../../systems/audit/logger');
const { privateReply } = require('../../utils/embeds');
const { C } = require('../../utils/constants');
module.exports = { group: 'audit', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('member').setDescription('Find bounded bot audit events for an exact user ID').addUserOption(o => o.setName('member').setDescription('Discord user').setRequired(true)),
  async execute(i, ctx) {
    const id = i.options.getUser('member', true).id, rows = [];
    const scanned = await history(i.guild, ctx, m => {
      const record = parseRecord(m, ctx.client.user.id);
      const match = record?.userId === id || (isEvent(m, ctx.client.user.id) && m.embeds.some(e => e.fields?.some(f => f.name === 'Discord user ID' && f.value === id)));
      if (match) rows.push((record ? record.reference : m.embeds[0]?.title) + ': ' + m.url);
      return rows.length < C.RECENT_LIMIT;
    });
    return privateReply(i, (rows.join('\n') || 'No matching bot records found in searched range.') + '\nSearched ' + scanned + ' messages. Maximum ' + C.RECENT_LIMIT + ' results.');
  }
};

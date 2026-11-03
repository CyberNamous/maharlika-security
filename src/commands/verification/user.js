'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { targetMember } = require('../../utils/permissions');
const { accountDays } = require('../../utils/validators');
const { history, parseRecord } = require('../../systems/audit/logger');
const { privateReply } = require('../../utils/embeds');
module.exports = {
  group: 'verification', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('user').setDescription('Current roles and bounded verification record lookup').addUserOption(o => o.setName('member').setDescription('Server member').setRequired(true)),
  async execute(i, ctx) {
    const id = i.options.getUser('member', true).id, member = await targetMember(i.guild, id);
    let found;
    const scanned = await history(i.guild, ctx, m => { const r = parseRecord(m, ctx.client.user.id); if (r?.userId === id) { found = r; return false; } });
    return privateReply(i, 'User ID: ' + id + '\nAccount age: ' + accountDays(member.user.createdTimestamp) + ' complete days\nMember role: ' + member.roles.cache.has(ctx.env.MEMBER_ROLE_ID) + '\nUnverified role: ' + member.roles.cache.has(ctx.env.UNVERIFIED_ROLE_ID) + '\n' + (found ? 'Historical success: ' + found.reference + ' — ' + found.url : 'No historical success found in searched range.') + '\nSearched ' + scanned + ' messages. Current roles are not proof of how verification happened.');
  }
};

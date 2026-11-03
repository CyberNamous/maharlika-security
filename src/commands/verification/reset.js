'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { request } = require('../../utils/confirmations');
module.exports = {
  group: 'verification', level: 'manager', data: new SlashCommandSubcommandBuilder().setName('reset').setDescription('Confirm reset of current verification roles; retain history').addUserOption(o => o.setName('member').setDescription('Server member').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Staff reason').setMaxLength(300)),
  async execute(i, ctx) { return request(i, ctx, 'reset', { target: i.options.getUser('member', true).id, reason: i.options.getString('reason') || '' }); }
};

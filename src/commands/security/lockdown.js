'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { request } = require('../../utils/confirmations');
module.exports = { group: 'security', level: 'manager', data: new SlashCommandSubcommandBuilder().setName('lockdown').setDescription('Confirm pausing verification without permission edits'), async execute(i, ctx) { return request(i, ctx, 'lockdown'); } };

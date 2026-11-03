'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { diagnostics } = require('../../utils/permissions');
const { privateReply } = require('../../utils/embeds');
module.exports = { group: 'admin', level: 'admin', data: new SlashCommandSubcommandBuilder().setName('setup').setDescription('Validate configured resources without changing the server'), async execute(i, ctx) { return privateReply(i, (await diagnostics(i.guild, ctx)).join('\n') + '\nReview all extra roles/member overwrites manually for audit privacy and access gating. This command does not rewrite permissions.'); } };

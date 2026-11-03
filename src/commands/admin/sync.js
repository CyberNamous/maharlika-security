'use strict';
const { PublicError } = require('../../utils/errors');
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { deploy } = require('../../core/deploy-commands');
const { privateReply } = require('../../utils/embeds');
module.exports = { group: 'admin', level: 'owner', data: new SlashCommandSubcommandBuilder().setName('sync').setDescription('Bot owner only: synchronize guild slash commands'),
  async execute(i, ctx) {
    if (ctx.syncBusy) throw new PublicError('Command synchronization is already running.');
    ctx.syncBusy = true; try { await deploy(ctx.env, ctx.commandJSON); return privateReply(i, 'Guild slash commands synchronized. Prefer npm run deploy for routine registration.'); } finally { ctx.syncBusy = false; }
  }
};

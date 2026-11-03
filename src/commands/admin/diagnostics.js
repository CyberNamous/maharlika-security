'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { diagnostics } = require('../../utils/permissions');
const { privateReply } = require('../../utils/embeds');
module.exports = { group: 'admin', level: 'admin', data: new SlashCommandSubcommandBuilder().setName('diagnostics').setDescription('On-demand resource, permissions and runtime diagnostics'),
  async execute(i, ctx) {
    const memory = process.memoryUsage(); const mib = n => (n / 1048576).toFixed(1) + ' MiB';
    return privateReply(i, (await diagnostics(i.guild, ctx)).join('\n') + '\nGateway ready: ' + ctx.client.isReady() + '\nHTTP listening: ' + !!ctx.server?.listening + '\nUptime: ' + Math.floor(process.uptime()) + 's\nRSS: ' + mib(memory.rss) + '\nHeap used: ' + mib(memory.heapUsed) + '\nCommands: ' + ctx.commands.size + ' subcommands / ' + ctx.commandJSON.length + ' groups\nEvents: ' + ctx.eventCount + '\nNo fixed RAM/CPU guarantee; measure on Render.');
  }
};

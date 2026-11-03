'use strict';
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { C } = require('../../utils/constants');
const { privateReply } = require('../../utils/embeds');
module.exports = { group: 'security', level: 'manager', data: new SlashCommandSubcommandBuilder().setName('config').setDescription('Read built-in security defaults; no runtime mutation'),
  async execute(i) { return privateReply(i, Object.entries(C).filter(([, v]) => typeof v === 'number').map(([k, v]) => k + ' = ' + v).join('\n') + '\nEdit src/utils/constants.js and redeploy to change these. No configuration is saved at runtime.'); }
};

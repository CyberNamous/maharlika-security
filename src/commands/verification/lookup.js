'use strict';
const { PublicError } = require('../../utils/errors');
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { referenceId } = require('../../utils/validators');
const { exactReference } = require('../../systems/audit/reference');
const { history } = require('../../systems/audit/logger');
const { privateReply } = require('../../utils/embeds');
module.exports = {
  group: 'verification', level: 'staff', data: new SlashCommandSubcommandBuilder().setName('lookup').setDescription('Find an exact staff verification reference').addStringOption(o => o.setName('reference_id').setDescription('MH-YYYY-XXXXXX').setRequired(true).setMinLength(14).setMaxLength(14)),
  async execute(i, ctx) {
    const ref = i.options.getString('reference_id', true);
    if (!referenceId(ref)) throw new PublicError('Invalid reference format. Use MH-YYYY-XXXXXX with uppercase hexadecimal suffix.');
    let record;
    const scanned = await history(i.guild, ctx, msg => { record = exactReference(msg, ctx.client.user.id, ref); return !record; });
    return privateReply(i, record ? { content: 'Exact match in ' + scanned + ' searched messages: ' + record.url, embeds: [record.embed] } : 'No matching record found in ' + scanned + ' searched messages. Older or deleted records may be unavailable.');
  }
};

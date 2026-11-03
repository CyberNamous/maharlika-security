'use strict';
const { PublicError } = require('../../utils/errors');
const { SlashCommandSubcommandBuilder } = require('discord.js');
const { authorize, textChannel } = require('../../utils/permissions');
const { buttons, embed, privateReply, NO_MENTIONS } = require('../../utils/embeds');
const { C } = require('../../utils/constants');
module.exports = {
  group: 'verification', level: 'manager', data: new SlashCommandSubcommandBuilder().setName('panel').setDescription('Publish or refresh the public checkpoint panel'),
  async execute(i, ctx) {
    authorize(i, ctx, 'manager');
    if (ctx.panelBusy) throw new PublicError('Panel refresh is already running.');
    ctx.panelBusy = true;
    try {
      const channel = await textChannel(i.guild, ctx.env.VERIFICATION_CHANNEL_ID, true);
      const data = { embeds: [embed('MAHARLIKA Security checkpoint', '1. Account must be at least ' + C.MIN_ACCOUNT_AGE_DAYS + ' complete days old.\n2. Complete a private typed CAPTCHA.\n3. Explicitly accept the server rules.\n\nAll three steps are mandatory. Use the button below to begin.')], components: [buttons([['mh:begin', 'Begin Verification']])], allowedMentions: NO_MENTIONS };
      let existing;
      if (ctx.panelId) { try { existing = await channel.messages.fetch({ message: ctx.panelId, cache: false }); } catch (error) { if (error.code !== 10008) throw error; ctx.panelId = null; } }
      if (!existing) {
        const page = await channel.messages.fetch({ limit: C.PAGE_SIZE, cache: false });
        existing = page.find(m => m.author.id === ctx.client.user.id && !m.webhookId && m.components.some(row => row.components.some(button => button.customId === 'mh:begin')));
      }
      const msg = existing ? await existing.edit(data) : await channel.send(data); ctx.panelId = msg.id;
      await privateReply(i, (existing ? 'Panel refreshed: ' : 'Panel published: ') + msg.url + '\nSearch is bounded to the latest ' + C.PAGE_SIZE + ' messages after restart; older panels may remain.');
    } finally { ctx.panelBusy = false; }
  }
};

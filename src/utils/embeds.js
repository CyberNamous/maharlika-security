'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const NO_MENTIONS = Object.freeze({ parse: [], repliedUser: false });
function embed(title, text, color = 0x244b77) { return new EmbedBuilder().setTitle(title).setDescription(text).setColor(color).setTimestamp(); }
function buttons(items) { return new ActionRowBuilder().addComponents(items.map(([id, label, style = ButtonStyle.Primary]) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style))); }
async function privateReply(i, data) {
  const body = typeof data === 'string' ? { content: data } : data;
  if (i.deferred || i.replied) return i.editReply({ ...body, allowedMentions: NO_MENTIONS });
  return i.reply({ ...body, flags: MessageFlags.Ephemeral, allowedMentions: NO_MENTIONS });
}
module.exports = { embed, buttons, privateReply, NO_MENTIONS };

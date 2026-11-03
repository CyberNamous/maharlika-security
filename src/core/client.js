'use strict';
const { Client, GatewayIntentBits, Options } = require('discord.js');
function createClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    allowedMentions: { parse: [], repliedUser: false },
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 0, GuildMemberManager: { maxSize: 100, keepOverLimit: member => member.id === member.client.user?.id },
      UserManager: 200, PresenceManager: 0, ReactionManager: 0, ReactionUserManager: 0,
      GuildScheduledEventManager: 0, GuildInviteManager: 0, GuildBanManager: 0,
      VoiceStateManager: 0, GuildStickerManager: 0, GuildEmojiManager: 0
    }),
    // No application sweepers/polling. Discord's own heartbeat/REST timers remain necessary.
    sweepers: { threads: { interval: 0, lifetime: 0 } },
    rest: { timeout: 10000, retries: 0, rejectOnRateLimit: () => true }
  });
}
module.exports = { createClient };

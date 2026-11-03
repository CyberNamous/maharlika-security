'use strict';
const { REST, Routes } = require('discord.js');
async function deploy(env, commandJSON) {
  const rest = new REST({ version: '10', timeout: 15000, retries: 0, rejectOnRateLimit: () => true }).setToken(env.DISCORD_TOKEN);
  return rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), { body: commandJSON });
}
module.exports = { deploy };

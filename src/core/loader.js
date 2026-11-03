'use strict';
const { PublicError } = require('../utils/errors');
const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');
const { logFailure } = require('../systems/audit/logger');
function loadCommands() {
  const commands = new Map(), groups = new Map();
  for (const group of ['verification','security','audit','admin']) {
    const builder = new SlashCommandBuilder().setName(group).setDescription('MAHARLIKA Security ' + group + ' commands').setDMPermission(false).setDefaultMemberPermissions(0n);
    const dir = path.join(__dirname, '..', 'commands', group);
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
      const command = require(path.join(dir, file));
      if (command.group !== group || typeof command.execute !== 'function' || !command.level) throw new PublicError('Invalid command module: ' + file);
      const key = group + ':' + command.data.name;
      if (commands.has(key)) throw new PublicError('Duplicate command: ' + key);
      commands.set(key, command); builder.addSubcommand(command.data);
    }
    groups.set(group, builder);
  }
  return { commands, commandJSON: [...groups.values()].map(b => b.toJSON()) };
}
function loadEvents(client, ctx) {
  if (ctx.eventsLoaded) throw new PublicError('Events already loaded');
  ctx.eventsLoaded = true; ctx.eventCount = 0;
  const dir = path.join(__dirname, '..', 'events');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
    const event = require(path.join(dir, file));
    const listener = (...args) => { Promise.resolve().then(() => event.execute(...args, ctx)).catch(error => logFailure('Event handler failed: ' + event.name, error)); };
    client[event.once ? 'once' : 'on'](event.name, listener); ctx.eventCount++;
  }
}
module.exports = { loadCommands, loadEvents };

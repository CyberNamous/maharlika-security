'use strict';
const { Events } = require('discord.js');
const { onJoin } = require('../systems/antiRaid/joinMonitor');
module.exports = { name: Events.GuildMemberAdd, async execute(member, ctx) { return onJoin(member, ctx); } };

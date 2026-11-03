'use strict';
const { PublicError } = require('./errors');
const { PermissionFlagsBits: P, ChannelType, GuildMember } = require('discord.js');
function requireGuild(i, ctx) {
  if (!i.inGuild() || !i.guild || i.guildId !== ctx.env.GUILD_ID) throw new PublicError('This action is only available in the configured server.');
}
function authorize(i, ctx, level = 'staff') {
  requireGuild(i, ctx);
  const owner = i.user.id === ctx.env.BOT_OWNER_ID;
  const admin = i.memberPermissions?.has(P.Administrator) || i.user.id === i.guild.ownerId;
  const roleIds = i.member?.roles?.cache ? [...i.member.roles.cache.keys()] : i.member?.roles || [];
  const manager = !!ctx.env.ADMIN_ROLE_ID && roleIds.includes(ctx.env.ADMIN_ROLE_ID);
  const staff = roleIds.includes(ctx.env.STAFF_ROLE_ID);
  const allowed = level === 'owner' ? owner : level === 'admin' ? admin || owner : level === 'manager' ? admin || owner || manager : admin || owner || manager || staff;
  if (!allowed) throw new PublicError('You are not authorized for this action.');
}
async function ownMember(guild) { return guild.members.me || guild.members.fetchMe(); }
async function targetMember(guild, id) { return guild.members.fetch({ user: id, force: true, cache: false }); }
async function managedRoles(guild, env) {
  const me = await ownMember(guild);
  if (!me.permissions.has(P.ManageRoles)) throw new PublicError('Bot needs Manage Roles.');
  const roles = [];
  for (const id of [env.MEMBER_ROLE_ID, env.UNVERIFIED_ROLE_ID]) {
    const role = guild.roles.cache.get(id) || await guild.roles.fetch(id);
    if (!role || role.managed || role.id === guild.id || me.roles.highest.comparePositionTo(role) <= 0 || !role.editable) throw new PublicError('Configured roles are missing or not manageable. Place the bot role above Member and Unverified.');
    if (role.permissions.has(P.Administrator) || role.permissions.has(P.ManageRoles) || role.permissions.has(P.ManageGuild)) throw new PublicError('Member and Unverified roles must not grant administrative permissions.');
    roles.push(role);
  }
  return { me, memberRole: roles[0], unverifiedRole: roles[1] };
}
async function textChannel(guild, id, history = false, staffOnly = false) {
  const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id);
  if (!channel || channel.guildId !== guild.id || channel.type !== ChannelType.GuildText) throw new PublicError('Configured channel is missing or is not a standard text channel.');
  const me = await ownMember(guild);
  const permissions = channel.permissionsFor(me);
  const needed = [P.ViewChannel, P.SendMessages, P.EmbedLinks];
  if (history) needed.push(P.ReadMessageHistory);
  if (!permissions?.has(needed)) throw new PublicError('Bot lacks required permissions in a configured channel.');
  if (staffOnly) {
    // Fail closed for the baseline everyone/verification roles. Arbitrary additional roles
    // and member overrides still require manual review by the server administrator.
    const unverifiedId = guild.client.security?.env.UNVERIFIED_ROLE_ID;
    const memberId = guild.client.security?.env.MEMBER_ROLE_ID;
    const ordinary = [guild.roles.everyone, guild.roles.cache.get(unverifiedId), guild.roles.cache.get(memberId)].filter(Boolean);
    if (ordinary.some(role => channel.permissionsFor(role)?.has(P.ViewChannel))) throw new PublicError('Staff audit/alert channel exposes View Channel to an ordinary role. Fix permissions first.');
  }
  return channel;
}
async function diagnostics(guild, ctx) {
  const result = [];
  try { await managedRoles(guild, ctx.env); result.push('Managed roles and hierarchy: OK'); } catch (e) { result.push('Roles: ' + e.message); }
  for (const key of ['VERIFICATION_CHANNEL_ID','CHECKS_CHANNEL_ID','AUDIT_CHANNEL_ID','SECURITY_ALERT_CHANNEL_ID']) {
    try { await textChannel(guild, ctx.env[key], key === 'AUDIT_CHANNEL_ID' || key === 'VERIFICATION_CHANNEL_ID', key === 'AUDIT_CHANNEL_ID' || key === 'SECURITY_ALERT_CHANNEL_ID'); result.push(key + ': OK'); } catch (e) { result.push(key + ': ' + e.message); }
  }
  for (const key of ['STAFF_ROLE_ID','ADMIN_ROLE_ID']) {
    if (ctx.env[key]) result.push(key + ': ' + (guild.roles.cache.has(ctx.env[key]) ? 'OK' : 'missing'));
  }
  return result;
}
module.exports = { requireGuild, authorize, ownMember, targetMember, managedRoles, textChannel, diagnostics, GuildMember };

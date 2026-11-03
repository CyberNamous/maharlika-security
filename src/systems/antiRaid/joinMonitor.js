'use strict';
const audit = require('../audit/logger');
const { C } = require('../../utils/constants');
async function onJoin(member, ctx) {
  if (member.guild.id !== ctx.env.GUILD_ID) return;
  // Count every event before any await; there is no role-assignment or REST burst per join.
  const snapshot = ctx.joins.add(member.user.createdTimestamp);
  if (ctx.joins.shouldAlert()) await audit.alert(member.guild, ctx, 'Suspicious join activity', snapshot.count + (snapshot.capped ? '+' : '') + ' joins retained in ' + C.RAID_JOIN_WINDOW_SECONDS + ' seconds.\n' + snapshot.risk + '\nNew accounts are not necessarily malicious. Use /security scan and confirmed /security lockdown to review.');
}
module.exports = { onJoin };

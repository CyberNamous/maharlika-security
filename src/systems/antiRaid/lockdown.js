'use strict';
const audit = require('../audit/logger');
class Lockdown {
  constructor() {
    // Fail closed on every boot: no disk state or permission-overwrite snapshot is needed.
    this.active = true; this.since = Date.now(); this.actor = 'startup'; this.changes = [];
  }
  async set(active, guild, ctx, actor) {
    if (this.active === active) return { changed: false, audited: true };
    this.active = active; this.since = Date.now(); this.actor = actor;
    const title = active ? 'Verification lockdown activated' : 'Verification lockdown lifted';
    const record = await audit.event(guild, ctx, title, { actor, detail: 'Verification-pause mode. No Discord permission overwrites were changed.' });
    await audit.alert(guild, ctx, title, 'Actor ID: ' + actor + '\nNew verification and final acceptance are ' + (active ? 'paused.' : 'enabled.') + '\nNo channel overwrites changed.');
    return { changed: true, audited: !!record };
  }
}
module.exports = { Lockdown };

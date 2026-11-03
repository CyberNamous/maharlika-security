'use strict';
const { C } = require('../../utils/constants');
class JoinWindow {
  constructor({ max = C.MAX_JOIN_EVENTS, windowMs = C.RAID_JOIN_WINDOW_SECONDS * 1000, clock = Date.now } = {}) {
    this.max = max; this.windowMs = windowMs; this.clock = clock;
    this.entries = new Array(max); this.head = 0; this.size = 0;
    this.young = 0; this.lastAlert = null; this.droppedUntil = 0;
  }
  dropHead() {
    if (this.entries[this.head].young) this.young--;
    this.entries[this.head] = undefined; this.head = (this.head + 1) % this.max; this.size--;
  }
  prune(now = this.clock()) {
    while (this.size && this.entries[this.head].at <= now - this.windowMs) this.dropHead();
  }
  add(createdTimestamp, now = this.clock()) {
    this.prune(now);
    if (this.size === this.max) {
      this.droppedUntil = Math.max(this.droppedUntil, this.entries[this.head].at + this.windowMs);
      this.dropHead();
    }
    const young = now - createdTimestamp < C.MIN_ACCOUNT_AGE_DAYS * C.DAY_MS;
    this.entries[(this.head + this.size) % this.max] = { at: now, young };
    this.size++; if (young) this.young++;
    return this.snapshot(now);
  }
  snapshot(now = this.clock()) {
    this.prune(now);
    const risk = this.size >= C.RAID_JOIN_THRESHOLD * 2
      ? 'High-risk join volume: staff review required (not a finding of maliciousness)'
      : this.size >= C.RAID_JOIN_THRESHOLD ? 'Suspicious join burst' : 'Normal activity';
    return { count: this.size, young: this.young, capped: now < this.droppedUntil, risk };
  }
  shouldAlert(now = this.clock()) {
    this.prune(now);
    if (this.size < C.RAID_JOIN_THRESHOLD || (this.lastAlert !== null && now - this.lastAlert < C.RAID_ALERT_COOLDOWN_SECONDS * 1000)) return false;
    this.lastAlert = now; return true;
  }
  clear() { this.entries.fill(undefined); this.head = 0; this.size = 0; this.young = 0; this.lastAlert = null; this.droppedUntil = 0; }
}
module.exports = { JoinWindow };

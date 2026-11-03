'use strict';
const { PublicError } = require('../../utils/errors');
const { randomBytes } = require('node:crypto');
const { C } = require('../../utils/constants');
const captcha = require('./captcha');
class Sessions {
  constructor({ max = C.MAX_SESSIONS, ttlMs = C.CAPTCHA_EXPIRY_SECONDS * 1000, attempts = C.CAPTCHA_MAX_ATTEMPTS, clock = Date.now } = {}) {
    this.max = max; this.ttlMs = ttlMs; this.attemptLimit = attempts; this.clock = clock;
    this.items = new Map(); this.cooldowns = new Map();
  }
  key(guild, user) { return guild + ':' + user; }
  prune() {
    const now = this.clock();
    for (const [key, s] of this.items) if (s.expiresAt <= now && s.state !== 'completing') this.items.delete(key);
    for (const [key, until] of this.cooldowns) if (until <= now) this.cooldowns.delete(key);
  }
  create(guild, user, answer) {
    this.prune(); const key = this.key(guild, user); const now = this.clock();
    if (this.cooldowns.has(key)) throw new PublicError('Please wait before starting another verification.');
    if (this.items.get(key)?.state === 'completing') throw new PublicError('Verification completion is already in progress.');
    if ((!this.items.has(key) && this.items.size >= this.max) || this.cooldowns.size >= C.MAX_COOLDOWNS) throw new PublicError('Verification is busy. Please try again shortly.');
    const s = { guild, user, id: randomBytes(12).toString('hex'), state: 'captcha', hash: captcha.digest(answer), attempts: 0, expiresAt: now + this.ttlMs };
    this.items.set(key, s); this.cooldowns.set(key, now + C.START_COOLDOWN_SECONDS * 1000); return s;
  }
  get(guild, user, id, state) {
    const key = this.key(guild, user), s = this.items.get(key);
    if (!s || s.guild !== guild || s.user !== user || s.id !== id) throw new PublicError('This session is no longer available or does not belong to you. Begin verification again.');
    if (s.expiresAt <= this.clock() && s.state !== 'completing') { this.items.delete(key); throw new PublicError('Verification expired. Begin verification again.'); }
    if (state && s.state !== state) throw new PublicError('This action is not valid for the current verification stage.');
    return s;
  }
  answer(guild, user, id, input) {
    const s = this.get(guild, user, id, 'captcha'); s.attempts++;
    if (captcha.matches(input, s.hash)) { delete s.hash; s.state = 'rules'; return { passed: true, session: s }; }
    const remaining = this.attemptLimit - s.attempts;
    if (remaining <= 0) this.items.delete(this.key(guild, user));
    return { passed: false, remaining: Math.max(0, remaining) };
  }
  claim(guild, user, id) { const s = this.get(guild, user, id, 'rules'); s.state = 'completing'; return s; }
  delete(guild, user) { return this.items.delete(this.key(guild, user)); }
  clear() { this.items.clear(); this.cooldowns.clear(); }
}
module.exports = { Sessions };

'use strict';
const { PublicError } = require('./errors');
const C = Object.freeze({
  SERVICE_NAME: 'MAHARLIKA Security',
  MIN_ACCOUNT_AGE_DAYS: 15, CAPTCHA_LENGTH: 6, CAPTCHA_MAX_ATTEMPTS: 5,
  CAPTCHA_EXPIRY_SECONDS: 600, RULES_ENTRY_LENGTH: 8, RULES_CONFIRM_LENGTH: 10, RAID_JOIN_THRESHOLD: 10,
  RAID_JOIN_WINDOW_SECONDS: 30, RAID_ALERT_COOLDOWN_SECONDS: 300,
  MAX_SESSIONS: 1000, MAX_COOLDOWNS: 2000, START_COOLDOWN_SECONDS: 10,
  MAX_JOIN_EVENTS: 2048, MAX_CONFIRMATIONS: 100, CONFIRM_SECONDS: 60,
  HISTORY_LIMIT: 500, PAGE_SIZE: 100, MAX_HISTORY_OPERATIONS: 2,
  RECENT_LIMIT: 5, MAX_ACTIVE_INTERACTIONS: 32, MAX_BUSY_RESPONSES: 4,
  HTTP_MAX_CONNECTIONS: 64, HTTP_MAX_REQUESTS_PER_SOCKET: 20, MAX_REFERENCES: 4096,
  DAY_MS: 86400000,
  RULES_SUMMARY: 'Welcome to Pinoy Legends! The community rules in short:\n\n- Be respectful: no harassment, threats, hate speech, or targeting others.\n- Keep private information private: no doxxing or sharing personal details.\n- Be honest: no impersonating staff, fake announcements, scams, or phishing.\n- Keep it clean: no spam, unapproved ads or invites, or explicit and illegal content.\n- Follow staff instructions and do not evade bans with alternate accounts.\n\nBreaking the rules may lead to warnings, restrictions, or removal. You can appeal through the official channel.',
  // Link to the full rules page. Required when RULES_SECRET is set.
  RULES_URL: 'https://guidelines-pinoylegends.pages.dev/'
});
function validateConstants(c = C) {
  for (const [key, value] of Object.entries(c)) {
    if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0 || value > 100000000)) throw new PublicError('Invalid built-in default: ' + key);
  }
  if (c.CAPTCHA_LENGTH > 16 || c.CAPTCHA_MAX_ATTEMPTS > 20 || c.CAPTCHA_EXPIRY_SECONDS > 3600 || c.HISTORY_LIMIT > 1000 || c.PAGE_SIZE > 100 || c.MAX_SESSIONS > 10000 || c.RAID_JOIN_THRESHOLD > c.MAX_JOIN_EVENTS) throw new PublicError('Built-in defaults exceed safety bounds');
  if (!c.RULES_SUMMARY || c.RULES_SUMMARY.length > 3500) throw new PublicError('Invalid RULES_SUMMARY');
  if (c.RULES_URL && !/^https:\/\//.test(c.RULES_URL)) throw new PublicError('RULES_URL must use HTTPS');
  return c;
}
module.exports = { C, validateConstants };

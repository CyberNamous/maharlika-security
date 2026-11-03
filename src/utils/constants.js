'use strict';
const { PublicError } = require('./errors');
const C = Object.freeze({
  SERVICE_NAME: 'MAHARLIKA Security',
  MIN_ACCOUNT_AGE_DAYS: 15, CAPTCHA_LENGTH: 6, CAPTCHA_MAX_ATTEMPTS: 5,
  CAPTCHA_EXPIRY_SECONDS: 300, RAID_JOIN_THRESHOLD: 10,
  RAID_JOIN_WINDOW_SECONDS: 30, RAID_ALERT_COOLDOWN_SECONDS: 300,
  MAX_SESSIONS: 1000, MAX_COOLDOWNS: 2000, START_COOLDOWN_SECONDS: 10,
  MAX_JOIN_EVENTS: 2048, MAX_CONFIRMATIONS: 100, CONFIRM_SECONDS: 60,
  HISTORY_LIMIT: 500, PAGE_SIZE: 100, MAX_HISTORY_OPERATIONS: 2,
  RECENT_LIMIT: 5, MAX_ACTIVE_INTERACTIONS: 32, MAX_BUSY_RESPONSES: 4,
  HTTP_MAX_CONNECTIONS: 64, HTTP_MAX_REQUESTS_PER_SOCKET: 20, MAX_REFERENCES: 4096,
  DAY_MS: 86400000,
  RULES_SUMMARY: 'Be respectful. No harassment, hate speech, scams, spam, or illegal content. Protect personal information. Follow Discord Terms and Community Guidelines and staff directions. Read the server rules channel before accepting. By selecting I Agree, you explicitly accept these rules.',
  // A real server rules URL may be set here; leave empty to use the complete summary above.
  RULES_URL: ''
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

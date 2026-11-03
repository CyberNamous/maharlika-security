'use strict';
const { C } = require('./constants');
const snowflake = value => typeof value === 'string' && /^[1-9][0-9]{16,19}$/.test(value) && BigInt(value) <= 18446744073709551615n;
const referenceId = value => typeof value === 'string' && /^MH-[0-9]{4}-[A-F0-9]{6}$/.test(value);
const accountOldEnough = (created, now = Date.now(), days = C.MIN_ACCOUNT_AGE_DAYS) => Number.isFinite(created) && created > 0 && now >= created && now - created >= days * C.DAY_MS;
const accountDays = (created, now = Date.now()) => Math.max(0, Math.floor((now - created) / C.DAY_MS));
function safeError(error) {
  const code = error && error.code;
  return typeof code === 'number' || (typeof code === 'string' && /^[A-Z_0-9]{1,40}$/.test(code)) ? String(code) : 'UNEXPECTED';
}
module.exports = { snowflake, referenceId, accountOldEnough, accountDays, safeError };

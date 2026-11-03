'use strict';
const { PublicError } = require('../utils/errors');
const { snowflake } = require('../utils/validators');
const { validateConstants, C } = require('../utils/constants');
const REQUIRED = ['DISCORD_TOKEN','CLIENT_ID','GUILD_ID','MEMBER_ROLE_ID','UNVERIFIED_ROLE_ID','VERIFICATION_CHANNEL_ID','CHECKS_CHANNEL_ID','AUDIT_CHANNEL_ID','SECURITY_ALERT_CHANNEL_ID','STAFF_ROLE_ID'];
const OPTIONAL_IDS = ['ADMIN_ROLE_ID','BOT_OWNER_ID'];
function loadEnvironment(env = process.env) {
  validateConstants();
  const missing = REQUIRED.filter(k => env[k] === undefined || env[k] === null || env[k] === '' || (typeof env[k] === 'string' && !env[k].trim()));
  if (missing.length) throw new PublicError('Missing environment variables: ' + missing.join(', '));
  const invalid = [...REQUIRED.filter(k => k.endsWith('_ID')), ...OPTIONAL_IDS].filter(k => env[k] && !snowflake(env[k]));
  if (typeof env.DISCORD_TOKEN !== 'string' || /\s/.test(env.DISCORD_TOKEN) || env.DISCORD_TOKEN.length < 20) invalid.push('DISCORD_TOKEN');
  if (env.HEALTHCHECK_TOKEN && (typeof env.HEALTHCHECK_TOKEN !== 'string' || env.HEALTHCHECK_TOKEN.length < 24 || env.HEALTHCHECK_TOKEN.length > 256)) invalid.push('HEALTHCHECK_TOKEN');
  if (env.RULES_SECRET && (typeof env.RULES_SECRET !== 'string' || /\s/.test(env.RULES_SECRET) || env.RULES_SECRET.length < 24 || env.RULES_SECRET.length > 256)) invalid.push('RULES_SECRET');
  if (env.RULES_SECRET && !C.RULES_URL) invalid.push('RULES_SECRET');
  const port = env.PORT === undefined || env.PORT === '' ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || (env.PORT && !/^\d+$/.test(env.PORT))) invalid.push('PORT');
  if (env.MEMBER_ROLE_ID === env.UNVERIFIED_ROLE_ID) invalid.push('MEMBER_ROLE_ID', 'UNVERIFIED_ROLE_ID');
  for (const key of ['STAFF_ROLE_ID', 'ADMIN_ROLE_ID']) if (env[key] === env.GUILD_ID) invalid.push(key);
  if ([env.MEMBER_ROLE_ID, env.UNVERIFIED_ROLE_ID].some(id => id === env.GUILD_ID || id === env.STAFF_ROLE_ID || id === env.ADMIN_ROLE_ID)) invalid.push('MEMBER_ROLE_ID','UNVERIFIED_ROLE_ID');
  if ([env.CHECKS_CHANNEL_ID, env.VERIFICATION_CHANNEL_ID].includes(env.AUDIT_CHANNEL_ID) || [env.CHECKS_CHANNEL_ID, env.VERIFICATION_CHANNEL_ID].includes(env.SECURITY_ALERT_CHANNEL_ID)) invalid.push('AUDIT_CHANNEL_ID','SECURITY_ALERT_CHANNEL_ID');
  if (invalid.length) throw new PublicError('Invalid environment variables: ' + [...new Set(invalid)].join(', '));
  return Object.freeze(Object.fromEntries([...REQUIRED, ...OPTIONAL_IDS, 'HEALTHCHECK_TOKEN', 'RULES_SECRET'].map(k => [k, env[k] || '']).concat([['PORT', port]])));
}
module.exports = { loadEnvironment, REQUIRED, OPTIONAL_IDS };

'use strict';
require('dotenv').config({ quiet: true });
const { loadEnvironment } = require('./config/environment');
const { createClient } = require('./core/client');
const { loadCommands, loadEvents } = require('./core/loader');
const { createHealthServer } = require('./core/health');
const { Sessions } = require('./systems/verification/sessions');
const { JoinWindow } = require('./systems/antiRaid/detector');
const { Lockdown } = require('./systems/antiRaid/lockdown');
const { logFailure } = require('./systems/audit/logger');
async function main() {
  let env;
  try { env = loadEnvironment(); } catch (error) { console.error('[configuration] ' + error.message); process.exitCode = 1; return null; }
  const client = createClient();
  const ctx = { env, client, ...loadCommands(), sessions: new Sessions(), joins: new JoinWindow(), lockdown: new Lockdown(), confirmations: new Map(), userLocks: new Set(), historyActive: 0, activeInteractions: 0, panelId: null, stopping: false };
  client.security = ctx;
  const server = createHealthServer(client, env); ctx.server = server;
  let shutdownPromise;
  ctx.shutdown = function shutdown(code = 0) {
    if (shutdownPromise) { if (code) process.exitCode = code; return shutdownPromise; }
    ctx.stopping = true; if (code) process.exitCode = code;
    shutdownPromise = (async () => {
      console.log('[shutdown] Stopping MAHARLIKA Security.');
      // Only a real shutdown deadline uses a timer. Allow in-flight writes to settle.
      const deadline = setTimeout(() => { console.error('[shutdown] Grace period exceeded; inspect in-flight role/audit operations.'); server.closeAllConnections(); client.destroy(); process.exit(code || 1); }, 10000);
      const closed = new Promise(resolve => { if (!server.listening) return resolve(); server.close(() => resolve()); server.closeIdleConnections(); });
      while (ctx.activeInteractions > 0 && !code) await new Promise(resolve => setTimeout(resolve, 50));
      await closed; await client.destroy();
      ctx.sessions.clear(); ctx.joins.clear(); ctx.confirmations.clear(); ctx.userLocks.clear();
      clearTimeout(deadline);
    })();
    return shutdownPromise;
  };
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => { ctx.shutdown().catch(error => { logFailure('Shutdown failed', error); process.exit(1); }); });
  process.on('unhandledRejection', error => { logFailure('Unhandled rejection: stopping', error); ctx.shutdown(1).catch(() => process.exit(1)); });
  process.on('uncaughtException', error => { logFailure('Uncaught exception: stopping', error); ctx.shutdown(1).catch(() => process.exit(1)); });
  client.on('error', error => logFailure('Discord client error', error));
  client.rest.on('rateLimited', () => console.error('[discord] Rate limited; request refused or deferred by Discord. No application retry loop.'));
  server.on('error', error => { logFailure('HTTP server error', error); ctx.shutdown(1).catch(() => process.exit(1)); });
  loadEvents(client, ctx);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(env.PORT, '0.0.0.0', resolve); });
  console.log('[startup] HTTP health server listening; Discord connection pending.');
  try { await client.login(env.DISCORD_TOKEN); } catch (error) { logFailure('Discord login failed; check dedicated bot token and Members intent', error); await ctx.shutdown(1); }
  return ctx;
}
if (require.main === module) main().catch(error => { logFailure('Startup failed', error); process.exitCode = 1; });
module.exports = { main };

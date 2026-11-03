'use strict';
require('dotenv').config({ quiet: true });
const { loadEnvironment } = require('../src/config/environment');
const { loadCommands } = require('../src/core/loader');
const { deploy } = require('../src/core/deploy-commands');
const { safeError } = require('../src/utils/validators');
async function main() {
  let env;
  try { env = loadEnvironment(); }
  catch (error) { console.error('[configuration] ' + error.message); process.exitCode = 1; return; }
  try { const { commandJSON, commands } = loadCommands(); await deploy(env, commandJSON); console.log('Registered ' + commandJSON.length + ' guild command groups / ' + commands.size + ' subcommands.'); }
  catch (error) { console.error('Command deployment failed (' + safeError(error) + '). Check token, application ID, guild ID and invite scopes.'); process.exitCode = 1; }
}
if (require.main === module) main();
module.exports = { main };

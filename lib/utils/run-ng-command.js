const crossSpawn = require('cross-spawn');
const latestVersions = require('./latest-versions');

/**
 * Runs an Angular CLI command with arguments.
 */
function runNgCommand(command, args = [], spawnOptions) {
  return crossSpawn.sync(
    'npx',
    ['-p', `@angular/cli@${latestVersions.Angular}`, 'ng', command, ...args],
    spawnOptions || {
      stdio: 'inherit',
    }
  );
}

module.exports = runNgCommand;

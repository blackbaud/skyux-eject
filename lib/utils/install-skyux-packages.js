const logger = require('@blackbaud/skyux-logger');
const latestVersions = require('./latest-versions');
const runNgCommand = require('./run-ng-command');

function installSkyuxPackages(ejectedProjectPath) {
  logger.info(`Installing '@skyux/packages'...`);

  runNgCommand(
    'add',
    [`@skyux/packages@${latestVersions.SkyUx}`, '--skip-confirmation'],
    {
      cwd: ejectedProjectPath,
      stdio: 'inherit',
    }
  );

  logger.info('Done.');
}

module.exports = installSkyuxPackages;

const logger = require('@blackbaud/skyux-logger');
const semver = require('semver');

const jsonUtils = require('./json-utils');

/**
 * Returns metadata describing a project's build tool.
 * E.g., @skyux-sdk/builder, @blackbaud-internal/skyux-angular-builders, etc.
 */
async function getBuildToolMetadata() {
  logger.verbose('Getting metadata for the currently installed build tool...');

  const packageJson = await jsonUtils.readJson('package.json');

  const buildTools = ['@skyux-sdk/builder'];

  const metadata = {};
  for (const packageName of buildTools) {
    const currentVersion = packageJson.devDependencies[packageName];
    if (currentVersion) {
      metadata.name = packageName;
      metadata.currentlyInstalledVersion = currentVersion;
    }
  }

  if (!metadata.name) {
    return null;
  }

  let majorVersion;
  try {
    majorVersion = semver.minVersion(metadata.currentlyInstalledVersion).major;
  } catch (err) {
    logger.warn(
      `[warn] A latest version could not be found for "${metadata.name}@${metadata.currentlyInstalledVersion}".\n`
    );

    majorVersion = null;
  }

  metadata.currentlyInstalledMajorVersion = majorVersion;

  logger.verbose('Build tool metadata:', metadata);

  return metadata;
}

module.exports = getBuildToolMetadata;

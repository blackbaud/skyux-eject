const fs = require('fs-extra');
const glob = require('glob');
const lodashMerge = require('lodash.merge');
const path = require('path');

const writeJson = require('./write-json');

const supportedSkyuxConfigProps = {
  app: {
    externals: true,
    theming: true,
  },
  appSettings: true,
  auth: true,
  codeCoverageThreshold: true,
  experiments: true,
  help: true,
  host: true,
  omnibar: true,
  params: true,
  pipelineSettings: true,
  routes: true,
};

function migrateKnownPlugins(existingConfig, newConfig) {
  const plugins = existingConfig.plugins;

  if (plugins) {
    for (const plugin of plugins) {
      switch (plugin) {
        case '@blackbaud/skyux-builder-plugin-auth-email-whitelist':
          newConfig.experiments = newConfig.experiments || {};
          newConfig.experiments.blackbaudEmployee = true;
          break;
      }
    }
  }
}

function applySupportedSkyuxConfigProps(
  supportedProps,
  existingConfig,
  newConfig
) {
  for (const key of Object.keys(supportedProps)) {
    if (Object.prototype.hasOwnProperty.call(existingConfig, key)) {
      if (supportedProps[key] === true) {
        newConfig[key] = existingConfig[key];
        continue;
      }

      /* istanbul ignore else */
      if (typeof supportedProps[key] === 'object') {
        newConfig[key] = {};
        applySupportedSkyuxConfigProps(
          supportedProps[key],
          existingConfig[key],
          newConfig[key]
        );
      }
    }
  }
}

function migrateCodeCoverageThreshold(newJson) {
  const codeCoverageThreshold = newJson.codeCoverageThreshold;

  if (codeCoverageThreshold) {
    let percent = 0;
    if (codeCoverageThreshold === 'standard') {
      percent = 80;
    } else if (codeCoverageThreshold === 'strict') {
      percent = 100;
    }

    newJson = lodashMerge(newJson, {
      pipelineSettings: {
        vsts: {
          testSettings: {
            unit: {
              codeCoverageThreshold: {
                branches: percent,
                functions: percent,
                lines: percent,
                statements: percent,
              },
            },
          },
        },
      },
    });

    delete newJson.codeCoverageThreshold;
  }
}

/**
 * Migrates skyuxconfig.*.json files; only includes supported properties.
 */
function migrateSkyuxConfigFiles(ejectedProjectPath, isInternal = true) {
  const files = glob.sync('skyuxconfig?(.*).json');

  if (!isInternal) {
    // Delete skyuxconfig.json files for public-facing projects.
    for (const file of files) {
      fs.removeSync(path.join(file));
    }
    return;
  }

  for (const file of files) {
    const contents = fs.readJsonSync(file);
    const newJson = {
      $schema:
        './node_modules/@blackbaud-internal/skyux-angular-builders/skyuxconfig-schema.json',
    };

    migrateKnownPlugins(contents, newJson);
    applySupportedSkyuxConfigProps(
      supportedSkyuxConfigProps,
      contents,
      newJson
    );

    migrateCodeCoverageThreshold(newJson);

    writeJson(path.join(ejectedProjectPath, file), newJson);
  }
}

module.exports = migrateSkyuxConfigFiles;

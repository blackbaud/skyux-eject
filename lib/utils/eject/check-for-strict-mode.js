const path = require('path');

const jsonCUtils = require('../jsonc-utils');

async function checkForStrictMode(projectPath) {
  const tsConfig = jsonCUtils.readJsonC(
    path.join(projectPath, 'tsconfig.json')
  );

  if (
    tsConfig.extends === './node_modules/@skyux-sdk/builder/tsconfig.strict'
  ) {
    return true;
  }

  return false;
}

module.exports = checkForStrictMode;

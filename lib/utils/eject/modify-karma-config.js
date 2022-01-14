const fs = require('fs-extra');

function removeKarmaJasmineHtmlReporter(karmaConfig) {
  karmaConfig = karmaConfig
    .replace(/(\s)+require\('karma-jasmine-html-reporter'\)(,)?/, '')
    .replace(
      /(\s)+(jasmineHtmlReporter: {)((\s)+suppressAll: true)(.*)(\s)+(},)/,
      ''
    )
    .replace(/(\s)?('kjhtml')(,)?/, '');

  return karmaConfig;
}

function disableRandomTests(karmaConfig) {
  karmaConfig = karmaConfig.replace(
    /(jasmine: {\n)/,
    `jasmine: {
        random: false,
`
  );
  return karmaConfig;
}

function modifyKarmaConfig(karmaConfigPath) {
  let karmaConfig = fs.readFileSync(karmaConfigPath).toString();

  karmaConfig = removeKarmaJasmineHtmlReporter(karmaConfig);
  karmaConfig = disableRandomTests(karmaConfig);

  fs.writeFileSync(karmaConfigPath, karmaConfig, { encoding: 'utf-8' });
}

module.exports = modifyKarmaConfig;

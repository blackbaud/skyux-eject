const mock = require('mock-require');

describe('Install @skyux/packages', () => {
  let crossSpawnSpy;
  let runNgCommandSpy;

  beforeEach(() => {
    crossSpawnSpy = jasmine.createSpy('crossSpawn');
    runNgCommandSpy = jasmine.createSpy('runNgCommand');

    mock('@blackbaud/skyux-logger', {
      info() {},
    });

    mock('cross-spawn', {
      sync: crossSpawnSpy,
    });

    mock('../lib/utils/run-ng-command', runNgCommandSpy);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should run `ng add @skyux/packages`', () => {
    const installSkyuxPackages = mock.reRequire(
      '../lib/utils/install-skyux-packages'
    );

    installSkyuxPackages('foobar');

    expect(runNgCommandSpy).toHaveBeenCalledWith(
      'add',
      ['@skyux/packages@^5', '--skip-confirmation'],
      { cwd: 'foobar', stdio: 'inherit' }
    );
  });
});

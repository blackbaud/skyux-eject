# SKY UX Eject Utility

This utility migrates a SKY UX 4 application to SKY UX 5 and replaces most of the SKY UX-specific developer practices with mainstream Angular practices.

## What is SKY UX 5?

SKY UX 5 is the next major version of SKY UX. The most significant changes are the adoption of Angular version 12 and the transition from SKY UX CLI to Angular CLI for all development tasks. Breaking changes have been limited mostly to those introduced by upgrading SKY UX dependencies, like Angular, AG Grid, and Angular Tree Component.

## Why should I migrate?

The move away from SKY UX CLI and onto Angular CLI means that you now have full access to the Angular ecosystem. All new features and bug fixes will be released in SKY UX 5, and support for SKY UX 4 will end in the near future.

## Migration steps

### Prepare your project

- **Confirm your project is using SKY UX 4**\
  If your project is not on SKY UX 4, migrate to that version. We have guides to help you migrate from [SKY UX 2 to 3](https://developer.blackbaud.com/skyux-migration-guide/v2-v3) and from [SKY UX 3 to 4](https://developer.blackbaud.com/skyux-migration-guide/v3-v4).

- **Upgrade Node.js**\
  Make sure you have installed [Node.js 14.17.0](https://developer.blackbaud.com/skyux/learn/get-started/prereqs#nodejs). This version of Node is known to work with Angular 12 and SKY UX 5; earlier or later versions may cause issues when building or serving your application.

- **Install the Angular 12 CLI**

  ```
  npm install --global @angular/cli@12
  ```

- **Upgrade all SKY UX 4 dependencies**\
  Upgrade all SKY UX component libraries in your project's `package.json` to the latest SKY UX 4 versions. This isolates any problems with `4.x` packages from any problems with SKY UX 5.

- **Upgrade AG Grid (if applicable)**\
  Upgrade all instances of `ag-grid-angular`, `ag-grid-community`, and `ag-grid-enterprise` to version `26.0.0` or higher. We are removing support for AG Grid version 23, 24, and 25, and are only supporting [version 26](https://blog.ag-grid.com/whats-new-in-ag-grid-26/). For breaking changes in [version 24](https://www.ag-grid.com/ag-grid-changelog/?fixVersion=24.0.0), [version 25](https://www.ag-grid.com/ag-grid-changelog/?fixVersion=25.0.0), and [version 26](https://www.ag-grid.com/ag-grid-changelog/?fixVersion=26.0.0), see the AG Grid changelog.

### Migrate your project

- **Create a backup of your project**\
  If you are using Git for source control, create a branch with no pending changes so that you can simply discard it if an error occurs during the migration. If you are using another source control type, use its process for backing up your current project, or copy your project to another folder as a backup.

- **Run the SKY UX eject utility**\
  Use [`npx`](https://www.npmjs.com/package/npx) to run the SKY UX 5 eject utility from this repo. The eject utility will transform your project's source code from a SKY UX project into an Angular CLI project (_the process may take several minutes to complete_).

  ```
  npx blackbaud/skyux-eject
  ```

- **Upgrade Angular tree component (if applicable)**\
  Update all references of `angular-tree-component` to point to version 11 of `@circlon/angular-tree-component`. This package changed its maintainers and namespace, and SKY UX 5 introduces a breaking change in the `@skyux/angular-tree-component` library to point to the new namespace. For breaking changes introduced in new versions, see the [`@circlon/angular-tree-component` changelog](https://github.com/CirclonGroup/angular-tree-component/blob/master/CHANGELOG.md).

### Address changes

- **Preserved source code**\
  In case you need to refer to your project's original source code during the migration, you can find it in a temporary folder named `.skyux4sourcecode`. This directory is specified in your project's `.gitignore` file to prevent it from being committed with your changes. You may safely delete this folder as well as the entry in `.gitignore` once you have completed the migration.

- **Changes to application routing**\
  The routing methodology has changed for SKY UX 5. In SKY UX 4, routing was handled automatically by converting any `index.html` files into Angular components and creating routes for them based on the project's folder structure. Migrating to SKY UX 5 will convert the `index.html` files to Angular components and add them to the application's routing module, then write those files to disk. This gives the consumer full control over routing, providing all the routing features of Angular such as the ability to [lazy-load feature modules](https://angular.io/guide/lazy-loading-ngmodules). You can read more about [Angular routing](https://angular.io/guide/router) on their documentation.

- **Removal of Protractor for e2e testing**\
  As of version 12, [Angular no longer installs Protractor for e2e testing](https://github.com/angular/protractor/issues/5502), and the Angular team plans to stop development on Protractor completely by version 15. You can install Protractor yourself as an [Angular CLI builder](https://angular.io/cli/e2e) so that e2e tests will run during the ADO build pipeline, but this is not done for you when you eject a project or create a new one.

- **End of support for pact testing**\
  Pact testing in SKY UX 4 relied on a SKY UX Builder plugin, and SKY UX Builder is no longer used with SKY UX 5. There was not a straightforward way of implementing the equivalent feature using an Angular CLI builder, so the SKY UX team surveyed consumers and found that pact testing in general has fallen out of favor among many development teams. Therefore the SKY UX team decided not to implement a pact testing solution for SKY UX 5.

- **Changes to file structure**\
  One of the more significant changes in SKY UX 5 is that you now have access to Angular's root files (e.g., `src/app/main.ts`, `src/app/app.module.ts`, etc.). With SKY UX 4, these files are managed entirely by `@skyux-sdk/builder`. In SKY UX 5, the `@skyux-sdk/builder` package has been removed.

  Notable files:

  - `src/app/sky-pages.module.ts` - This module used to be generated by `@skyux-sdk/builder`; it is primarily used to declare the routing components.
  - `src/app/app-extras.module.ts` - This file should be exactly the same as it was in your SKY UX 4 project.\*
  - `src/app/**/index.component.html|scss|ts` - These files represent the components that were once auto-generated from `index.html` files in the SKY UX 4 source code. These components are added as routes for you in the ejected SKY UX 5 application using the same folder structure routing logic from SKY UX 4.

  \* As you optimize your application, you will likely factor out these modules into lazy-loaded feature modules (see below for how to refactor your application to use lazy-loaded feature modules).

- **Remove `entryComponents`**\
  Remove `entryComponents` from Angular modules in your project. They are no longer required with the Ivy compiler and runtime, and leaving them in can cause issues with unit tests that import the Angular module where they are declared.

- **Removal of skyuxconfig.json**\
  The `skyuxconfig.json` file is no longer used in applications built by third-party consumers of SKY UX 5. If you previously used the `appSettings` section to store values accesible through `SkyAppConfig`, you should move those to your Angular project's [`environments/environment.ts` and/or `environments/environment.prod.ts` file](https://angular.io/guide/build).

### Test the migration

- Run `ng lint` and `ng test` to confirm all linting and unit tests pass.

- Run `ng serve`. Successfully launching your application is the first step to verify the migration. Check your browser to confirm that your application runs properly. If you only see the green wait indicator, something went wrong. Check Troubleshooting below.

### Troubleshooting

For migration problems, check these common issues for potential fixes. In some cases, you need to discard your branch's changes and re-run the migration after resolving the issue.

- **Testing components with animations**\
  SKY UX 5 stopped importing the `BrowserAnimationsModule`, because it prevents consumers from creating lazy-loaded modules. You will now need to import NoopAnimationsModule in your `TestBed` configuration. A common console error caused by this change may look something like this:

  ```
  Error: Unexpected synthetic listener @inputState.start found. Please make sure that:
                - Either `BrowserAnimationsModule` or `NoopAnimationsModule` are imported in your application.
  ```

- **Fixing template errors**\
  Angular CLI allows for much better type-checking in templates than was possible with SKY UX CLI, so you may find many instances where an incorrect type is passed to a component's input. For instance, if you use the SKY UX fluid grid component, you may see an error when you specify column's size, e.g. `screenSmall="1"`, as a `string`. Instead of coercing it into a `number` like in SKY UX 4, Angular will throw a compilation error. Primitives other than `string` values, such as `boolean` or `number` values, must be specified using Angular's data-binding syntax, e.g. `[screenSmall]="1"` or `[someBoolInput]="true"`.

  You may also find instances where you imported an enum from a SKY UX library to specify on a component's input, and now that enum is marked as deprecated. All SKY UX 5 component inputs that once used enums now use a `string` union type, which makes it much more convenient to specify values in the template instead of importing the enum in the component class and exposing the value via a public property. For example, the fluid grid's `gutterSize` property may now be specified with a `string` value of `large`, `medium`, or `small` directly in the template instead of using the `SkyFluidGridGutterSize` enum.

- **The Angular Update Guide**\
  The [Angular Update Guide](https://update.angular.io/?l=3&v=9.0-12.0) provides customized update instructions, based on the current and target versions that you specify. It includes basic and advanced update paths, to match the complexity of your applications. It also includes troubleshooting information and any recommended manual changes to help you get the most out of the new release.

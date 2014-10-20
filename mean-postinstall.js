'use strict';

var fs = require('fs'),
  path = require('path'),
  npm = require('npm'),
  shell = require('shelljs'),
  chalk = require('chalk');

function loadPackageJson(path, callback) {
  fs.readFile(path, function(err, data) {
    if (err) return callback(err);

    try {
      var pkg = JSON.parse(data.toString());
      pkg.meanVersion = pkg.mean || pkg.version;
      callback(null, pkg);
    } catch (err) {
      return callback(err);
    }
  });
}

function requiresRoot(callback) {
  loadPackageJson(process.cwd() + '/package.json', function(err, data) {
    if (err || (data.name !== 'mean' && !data.mean)) {
      console.log(chalk.yellow('Invalid MEAN app or not in app root'));
    } else {
      callback();
    }
  });
}

function packagesNpmInstall(source) {
  var packages = path.join(process.cwd(), source);
  npm.load({
    loglevel: 'error'
  }, function(err, npm) {
    fs.readdir(packages, function(err, files) {
      if (err && 'ENOENT' !== err.code) throw Error(err);

      if (!files || !files.length) return;
      console.log(chalk.green('Auto installing package dependencies'));

      files.forEach(function(file) {
        var pkgPath = path.join(packages, file);

        packagesMeanJson(pkgPath);

        loadPackageJson(path.join(pkgPath, 'package.json'), function(err, data) {
          if (err || !data.mean) return;

          npm.commands.install(pkgPath, [pkgPath], function(err) {
            if (err) {
              console.log(chalk.red('Error: npm install failed'));
              return console.error(err);
            } else {
              console.log(chalk.green('    Dependencies installed for package ' + file));
            }
          });
        });
      });
    });
  });
}

function packagesMeanJson(source) {
  // Load mean.json
  loadPackageJson(path.join(source, 'mean.json'), function(err, data) {
    if (err || !data) return;

    for (var dep in data.dependencies) {
      shell.cd(process.cwd());
      shell.exec('node node_modules/meanio/bin/mean-install ' + dep + '@' + data.dependencies[dep], console.log);
    }
  });
}

module.exports = {
  loadPackageJson: loadPackageJson,
  requiresRoot: requiresRoot,
  packagesNpmInstall: packagesNpmInstall,
  packagesMeanJson: packagesMeanJson,
  postinstall: function() {
    requiresRoot(function() {
      console.log(chalk.green('Installing Bower dependencies'));
      require('bower').commands.install().on('error', function(err) {
        console.log(chalk.red(err));
      });

      packagesNpmInstall('packages');
      packagesNpmInstall('packages/custom');
      packagesNpmInstall('packages/core');

      // Load mean.json
      var source = process.cwd();
      packagesMeanJson(source);
    });
  }
};

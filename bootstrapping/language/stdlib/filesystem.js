var dres = require('../../utilities/descriptiveresults');

const fs = require('fs');
const path = require('path');

var newReader = () => {
  return dres.result({
    status: 'internal',
    info: 'not yet implemented'
  });
}

var newWriter = (writeStream) => {
  var api = {};

  api.write = (args, ctx) => {
    if ( args.length !== 1 || args[0].type !== 'string' ) {
      return dres.resInvalid('usage: write <data:string>');
    }
    writeStream.write(args[0].value, 'utf8');
    return dres.resOK(null);
  }
  api.close = (args, ctx) => {
    writeStream.close();
    return dres.resOK(null);
  }

  return dres.resOK(api, { type: 'funcmap' });
}

var newLocalDirectoryFS = rootDirectory => {
  // Check if a directory is, or is inside, the rootDirectory,
  // then return a normalized path.
  var filter_ = pth => {
    var relative = path.relative(rootDirectory,
      path.join(rootDirectory, pth));
    var isOK = true
      && typeof relative === 'string'
      && !relative.startsWith('..')
      && !path.isAbsolute(relative)
      ;
    if ( ! isOK ) return dres.resInvalid(
      'path escapes this instance of localDirectoryFS', {
        subject: {
          rootDirectory: rootDirectory,
          oritinal: pth,
          joined: path.join(rootDirectory, pth),
          relative: relative
        }
      }
    );
    return dres.resOK(path.normalize(
      path.join(rootDirectory, relative)));
  }
  var api = {
    ow: args => {
      if ( args.length !== 1 || args[0].type !== 'string' ) {
        return dres.resInvalid('usage: w <path:string>');
      }
      pth = args[0].value;

      // Verify file path
      var dir = filter_(path.dirname(pth));
      if ( dres.isNegative(dir) ) return dir;
      dir = dir.value;
      pth = path.join(dir, path.basename(pth));

      try {
        if ( fs.existsSync(dir) ) {
          let stat = fs.lstatSync(dir);
          if ( ! stat.isDirectory ) {
            return dres.resInvalid('parent path is not a directory: '+dir);
          }
        } else {
          // Create directory
          fs.mkdirSync(dir, { recursive: true });
        }

        return newWriter(fs.createWriteStream(pth));
      } catch (fsError) {
        return dres.resExternal(fsError);
      }
    },
    or: args => {
      if ( args.length !== 1 || args[0].type !== 'string' ) {
        return dres.resInvalid('usage: r <path:string>');
      }
      pth = args[0].value;

      // Verify file path
      var dir = filter_(path.dirname(pth));
      if ( dres.isNegative(dir) ) return dir;
      pth = path.join(dir, path.basename(pth));

      try {
        if ( fs.existsSync(dir) ) {
          let stat = fs.lstatSync(dir);
          if ( ! stat.isDirectory ) {
            return dres.resInvalid('parent path is not a directory: '+dir);
          }
        } else {
          return dres.result({ status: 'empty', info: 'path not found' });
        }

        if ( ! fs.existsSync(pth) ) {
          return dres.result({ status: 'empty', info: 'file not found' });
        }
        let stat = fs.lstatSync(pth);
        if ( stat.isDirectory ) {
          return dres.result({
            status: 'internal',
            info: 'read not yet implemented for directories'
          });
        }

        return newReader({
          path: pth,
          size: stat.size
        });
      } catch (fsError) {
        return dres.resExternal(fsError);
      }
    }
  };
  return dres.resOK(api, { type: 'funcmap' });
}

var fsfactory = {
  new: (args, ctx) => {
    var o = {};
    if ( args.length !== 1 || args[0].type !== 'string' ) {
      return dres.resInvalid('usage: new <uri:string>');
    }
    var source = args[0].value;
    var schemeSep = source.indexOf(':');
    var protocol = source.substr(0, schemeSep);
    var locator = source.substr(1+schemeSep);
    if ( protocol !== 'file' ) return dres.resInvalid(
      'URL scheme is not supported: ' + source
    );
    // For information on why we don't include two slashes after the protocol
    // in LePoT URLs, refer to the following website:
    // https:www.w3.org/People/Berners-Lee/FAQ.html#etc

    // Remaining portion of code is specific to "file:" protocol
    var stat = fs.lstatSync(locator);
    if ( ! stat.isDirectory() ) {
      return dres.resInvalid('path begins with "file:" but is not a directory: '
        + source);
    }
    return newLocalDirectoryFS(locator);
  }
};

var lib = {};
lib.install = api => {
  api.registerMap('fs', fsfactory);
}

module.exports = lib;
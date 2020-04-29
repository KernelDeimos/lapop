'use strict';
// Loads all LePoT files from a directory, handling dependancy
// resolution on the fly.

/*
  Thoughts:
    - This means folders can't depend on their subfolders, but sibling folders
      can have dependancies at any depths.

*/

const fs = require('fs');
const pth = require('path');

var memory = require(
  '../../interpreting/memory');
var primitives = require(
  '../../parsing/primitives');
var dhelp = require(
  '../../utilities/datahelper');
var dres   = require(
  '../../utilities/descriptiveresults');
var streams = require(
  '../../interpreting/streams');
var context  = require(
  '../../language/context');
var definitions = require(
  '../../parsing/definitions')({
    registry: memory.registry });

var patternFoundTriggers = {};

var lib = {};

lib.exectx = context.newStandardExecutionContext();

var codePattern = [['list',['list', ['symbol', 'list']]]];
memory.registry('pattern', 'script:load').def = codePattern;

lib.loadDirectory = root => {
  var recur = () => {};
  recur = path => {
    var process_ = () => {};
    var processFile_ = (filePath, start, newPatterns, extra) => {
      start = start || 0;
      extra = extra || {};
      extra.filePath = filePath;

      let data = fs.readFileSync(filePath);
      let s = primitives.newStream(data.toString(), start);

      s = primitives.eat_whitespace(s).stream;
      let tokens = primitives.parse_list_tokens(null, primitives.try_any, s);
      if ( dres.isNegative(tokens) ) {
        console.log('\0x1B[31;1mYES NEGATIVE TOKENS\0x1B[0m');
      }
      // TODO: The `['list'].concat` part is a code smell now. Maybe execBlockHere
      //       should be able to just take `tokens.value` as its input.
      let exS = streams.newListStream(dhelp.processData(null, ['list'].concat(tokens.value)).value, 0);

      process_(exS, newPatterns, extra);
    }
    var process_ = (s, newPatterns, extra) => {
      newPatterns = newPatterns || [];
      extra = extra || {};

      // Reset current package
      //   (file will be in root package unless otherwise declared)
      memory.currentPackage = '';

      // while ( ! s.eof() ) {

        // Add listener to detect new patterns
        let listenerAPI = memory.addListener((item) => {
          if ( item.type === 'put' && item.of === 'pattern') {
            newPatterns.push(item.for);
          }
        });

        // This is the current situation
        let result = lib.exectx.execBlockHere(s);

        // Remove new pattern listener
        listenerAPI.remove();

        // NEXT: Fix here
        if ( dres.isNegative(result) ) {
          if ( result.status === 'unknown' ) {
            console.log(
              `closing ${extra.filePath} to wait for pattern ${result.subject}`);
            if ( ! patternFoundTriggers.hasOwnProperty(result.subject) )  {
              patternFoundTriggers[result.subject] = [];
            }
            s = result.stream;
            // TODO: end file event goes here
            patternFoundTriggers[result.subject].push({
              stream: s,
              newPatterns: newPatterns,
              extra: {
                filePath: extra.filePath,
                pkg: memory.currentPackage
              }
            });
          } else {
            process.exit(1);
          }
          // break;
          return;
        }
        /*
        if ( result.of === 'script:load' ) {
          let lis = dhelp.processData(null, result.value[0]);
          lib.exectx.execBlockHere(lis);
        }
        */

        // file completed; pattern triggers may be invoked now
        newPatterns.forEach(patternName => {
          if ( ! patternFoundTriggers.hasOwnProperty(patternName) )
            return;
          patternFoundTriggers[patternName].forEach(triggerOperands => {
            memory.currentPackage = triggerOperands.extra.pkg || '';
            console.log(
              `found ${patternName}; read to continue ${triggerOperands.filePath}`);
            process_(
              triggerOperands.stream,
              triggerOperands.newPatterns,
              triggerOperands.extra
            );
          });
        });
      // }
    };

    var p = new Promise((resolve, reject) => {
      fs.readdir(path, (err, files) => {
        if ( err != null ) reject(err);
        let directories = [];
        for ( let i=0; i < files.length; i++ ) {
          let filePath = pth.join(path, files[i]);
          let stats = fs.lstatSync(filePath);
          if ( stats.isDirectory() ) directories.push(filePath);
          else if ( pth.extname(filePath) === '.lepot' ) {
            processFile_(filePath);
          }
        }
        var recurPromises = directories.map(dirPath => recur(dirPath));
        resolve(Promise.all(recurPromises));
      });
    });

    return p;
  };

  return recur(root);
};

module.exports = lib;

var bfs = () => {};
var bfs = (impl) => {
  var leaves = impl.getLeaves();
  var branches = impl.getBranches();

  leaves.forEach(v => impl.nextNode(v, () => {}));
  branches.forEach(v => impl.nextDepth(v, bfs));
}

var fileCrawler = (path) => {
  //
}
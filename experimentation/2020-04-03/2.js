'use strict';
const fs = require('fs');

var memory = require(
  '../../bootstrapping/interpreting/memory');
var interpreter = require(
  '../../bootstrapping/interpreting/interpreter')({
    registry: memory.registry });
var streams = require(
  '../../bootstrapping/interpreting/streams');
var evaluators = require(
  '../../bootstrapping/interpreting/evaluators');
var definitions = require(
  '../../bootstrapping/parsing/definitions')({
    registry: memory.registry });
var primitives = require(
  '../../bootstrapping/parsing/primitives');
var dres   = require(
  '../../bootstrapping/utilities/descriptiveresults');
var dhelp  = require(
  '../../bootstrapping/utilities/datahelper');
var fmaps  = require(
  '../../bootstrapping/interpreting/functionmaps');
var context  = require(
  '../../bootstrapping/language/context');

var codePattern = [['list',['list', ['symbol', 'list']]]];
memory.registry('pattern', 'script').def = codePattern;
memory.registry('pattern', 'now').def = codePattern;

var a = {};

var root = context.newStandardExecutionContext();
a.exec = null;

a.process_definitions = (s) => {
    // Script is allowed to begin with whitespace
    s = primitives.eat_whitespace(s).stream;

    while ( ! s.eof() ) {
        let result = definitions.try_def(s);
        s = result.stream;
        if ( dres.isNegative(result) ) {
            return result;
        }
        memory.registry(result.of, result.for).def = result.value;
        if ( result.of === 'now' && result.for === 'B' ) {
          let lis = dhelp.processData(null, result.value[0]);
          root.execBlockHere(lis);
        }
        s = primitives.eat_whitespace(s).stream;
    }

    return dres.resOK();
}


a.load = filename => {
  var data = fs.readFileSync(filename);
  var res = a.process_definitions(primitives.newStream(
    data.toString(), 0));
}

a.load('./1.lepot');

// console.log(memory.registry('script', 'testcursor'));

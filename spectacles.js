// This file contains functions for viewing the internal
// data of this framework. Visibility of data now will save
// hours of potential debugging time.

var bootDebug = null;

var exp = {};

exp.printOfType = (typ) => {
  patterns = [];
  var store = bootDebug.getStores()[typ];
  for ( k in store ) {
    console.log(`=== def ${typ} ${k} === `);
    console.log(
      JSON.stringify(
        store[k]));
  }
}

module.exports = soup => {
  bootDebug = soup.bootDebug;
  return exp;
}
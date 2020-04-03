var lib = {};

lib.newListStream = (list, index) => {
  var o = {};
  o.preview = list.slice(index);
  o.eof = () => index >= list.length;
  o.val = () => list[index];
  o.rest = () => list.slice(index);
  o.next = () => lib.newListStream(list, index+1);
  return o;
}

module.exports = lib;

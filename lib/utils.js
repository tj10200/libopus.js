var libopus = require('../build/libopus.js').instance;

function stringifyError(errorId) {
  return libopus.Pointer_stringify(libopus._opus_strerror(errorId));
}

function Utils(opts) {
  // Allow use without new
  if (!(this instanceof Utils)) return new Utils(opts);

  this.initialize(opts);
}

Utils.prototype.initialize = function(opts) {
  opts = extend({
    frameSizeMs: 20,
    channels: 2,
    sampleRate: 16000,
    maxEncodedSize: 1000,
  }, opts);

  this._frameSizeMs = opts.frameSizeMs;
  this._channels = opts.channels;
  this._sampleRate = opts.sampleRate;
  this._frameSize = opts.channels * opts.frameSizeMs * opts.sampleRate / 1000,
  this._maxFrameSize = opts.maxEncodedSize;
}

Utils.prototype.make_pcm_packet = function() {
  return libopus._malloc(this._frameSize);
}

Utils.prototype.free_pcm_packet = function(pcm) {
  libopus._free(pcm);
}

Utils.prototype.make_data_packet = function(size = this._maxFrameSize) {
  return libopus._malloc(size);
}

Utils.prototype.free_data_packet = function(data) {
  libopus._free(data);
}

Utils.prototype.make_pointer_from_data = function(data) {
  if (!(data instanceof Buffer)) {
    // Invalid input data
    throw new TypeError('data must be a Buffer');
  }

  // make a malloc'd array and copy the data
  let ret = this.make_data_packet(data.length);
  libopus.HEAPU8.set(data, ret);

  return ret;
}

// Note that the opus documentation is not consistent with that 120ms
// that is suggested in the description of opus_decode. In other places
// such as the overview of the Opus Encoder, 60ms is used as the upper
// limit.
// To be on the safe side, 120ms has been choosen here.
var pcm_len = 4 /*Float32*/ * 2 /*channels*/ * 120 /*ms*/ * 48 /*samples/ms*/;
var data_len = 120 /*ms*/ * 512 /*bits per ms*/;

module.exports = {
  stringifyError: stringifyError,
  p_pcm: libopus._malloc(pcm_len),
  p_pcm_len: pcm_len,
  p_data: libopus._malloc(data_len),
  p_data_len: data_len,
  Utils: Utils,
};

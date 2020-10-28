var libopus = require('../build/libopus.js').instance;
var utils = require('./utils').Utils;
var strerr = require('./utils').stringifyError;

function Reencoder(opts) {
    // Allow use without new
    if (!(this instanceof Reencoder)) return new Reencoder(opts);

    opts = extend({
        rate: 16000,
        channels: 2,
        application: Application.AUDIO,
        unsafe: false
    }, opts);
    this._rate = opts.rate;
    this._channels = opts.channels;
    this._application = opts.application;
    this._unsafe = opts.unsafe;
    this.make_encoder();
    this.make_decoder();
}


Reencoder.prototype.make_encoder = function() {
    // Allocate space for the encoder state
    var size = libopus._opus_encoder_get_size(this._channels);
    var enc = libopus._malloc(size);
    // Initialize the encoder
    var ret = libopus._opus_encoder_init(enc, this._rate, this._channels, this._application);
    if (ret !== 0) {
        // Free allocated space and throw error
        libopus._free(enc);
        throw strerr(ret);
    }
    // In unsafe mode, that's it. However in safe mode, we copy the state
    // to a local buffer and free our allocated memory afterwards
    if (this._unsafe) {
        this._enc = enc;
    } else {
        this._enc = libopus.HEAPU8.slice(enc, enc + size);
        libopus._free(enc);
    }
}

Reencoder.prototype.make_decoder = function() {
    // Allocate space for the decoder state
    var size = libopus._opus_decoder_get_size(this._channels);
    var dec = libopus._malloc(size);
    // Initialize the decoder
    var ret = libopus._opus_decoder_init(dec, this._rate, this._channels);
    if (ret !== 0) {
        // Free allocated space and throw error
        libopus._free(dec);
        throw strerr(ret);
    }
    // In unsafe mode, that's it. However in safe mode, we copy the state
    // to a local buffer and free our allocated memory afterwards
    if (this._unsafe) {
        this._dec = dec;
    } else {
        this._dec = libopus.HEAPU8.slice(dec, dec + size);
        libopus._free(dec);
    }
}


Reencoder.prototype.decode_opus_frame = function(opusData) {
    let u = new utils.Utils({});
    let opusPtr = u.make_pointer_from_data(opusData);
    let pcm = u.make_pcm_packet();

    /*
    	n := int(C.opus_decode(
		dec.p,
		(*C.uchar)(&data[0]),
		C.opus_int32(len(data)),
		(*C.opus_int16)(&pcm[0]),
		C.int(cap(pcm)/dec.channels),
		0))
     */

    let numSamples = libopus._opus_decode(
        this._dec,
        opusPtr,
        opusData.length,
        pcm,
        pcm.length / this._channels);

    u.free_data_packet(opusPtr);
    return {
        pcm: pcm,
        numSamples: numSamples,
    };
}

Reencoder.prototype.encode_pcm_frame = function (pcmData, maxOutSize) {
    if (!(pcmData instanceof Int16Array)){
      // Invalid input data
      throw new TypeError('pcmData must be a Int16Array');
    }

    let u = new utils.Utils({maxEncodedSize: maxOutSize});
    let outOpus = u.make_data_packet(maxOutSize);
    let pcmPtr = u.make_pointer_from_data(pcmData.buffer);

    /*
    n := int(C.opus_encode(
		enc.p,
		(*C.opus_int16)(&pcm[0]),
		C.int(samples),
		(*C.uchar)(&data[0]),
		C.opus_int32(cap(data))))
     */
    let samples = pcmData.length / enc.channels;
    let numSamples = libopus._opus_encode(
        this._enc,
        pcmPtr,
        samples,
        outOpus,
        maxOutSize,
    )

    return numSamples;
}

Reencoder.prototype.reencode_opus_frame = function(opusData, maxSize) {
    let pcm = this.decode_opus_frame(opusData);
    let outOpus = this.encode_pcm_frame(pcm, maxSize);
    let u = new utils.Utils({});
    u.free_data_packet(pcm);
    return outOpus;
}

module.exports = Reencoder;

module.exports = {
  Encoder: require('./lib/encoder.js'),
  Decoder: require('./lib/decoder.js'),
  Reencoder: require('./lib/reencoder.js'),
  Utils: require('./lib/utils.js'),
  libopus: require('./build/libopus.js').instance
};

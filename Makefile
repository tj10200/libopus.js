OUTPUT_DIR=./build
HTML=$(OUTPUT_DIR)/libopus.html
EMCC_OPTS=-O3 --memory-init-file 1 --closure 1 -c
EXPORTS:='_free','_malloc','_opus_strerror','_opus_get_version_string','_opus_encoder_get_size','_opus_encoder_init','_opus_encode','_opus_encode_float','_opus_encoder_ctl','_opus_decoder_get_size','_opus_decoder_init','_opus_decode','_opus_decode_float','_opus_decoder_ctl','_opus_packet_get_nb_samples'

LIBOPUS_STABLE=tags/v1.1.2
LIBOPUS_DIR=./opus
LIBOPUS_OBJ=$(LIBOPUS_DIR)/.libs/libopus.a

POST_JS=./lib/post.js
LIBOPUS_JS=$(OUTPUT_DIR)/libopus.bc

LIBOPUS_WASM=$(OUTPUT_DIR)/libopus.wasm
LIBOPUS_EXPORT_NAME="LibOpus"
LIBOPUS_WASM_LOOKUP='wasmBinaryFile = locateFile'

default: $(LIBOPUS_JS)

clean:
	rm -rf $(OUTPUT_DIR) $(LIBOPUS_DIR)
	mkdir $(OUTPUT_DIR)

.PHONY: clean default

$(LIBOPUS_DIR):
	git submodule update --init --recursive
	cd $(LIBOPUS_DIR); git checkout ${LIBOPUS_STABLE}

$(LIBOPUS_OBJ): $(LIBOPUS_DIR)
	cd $(LIBOPUS_DIR); ./autogen.sh
	cd $(LIBOPUS_DIR); emconfigure ./configure --disable-extra-programs --disable-doc
	cd $(LIBOPUS_DIR); emmake make

$(LIBOPUS_JS): $(LIBOPUS_OBJ) $(POST_JS)
	emcc -o $@ $(EMCC_OPTS) -s EXPORTED_FUNCTIONS="[$(EXPORTS)]" -s EXPORT_NAME=$(LIBOPUS_EXPORT_NAME) -s ALLOW_MEMORY_GROWTH=1 -s TOTAL_MEMORY=16MB $(LIBOPUS_OBJ)
	cat $(POST_JS) >> $(LIBOPUS_JS)
	# So, there is a bug in static-module (used by brfs) which causes it to fail
	# when trying to parse our generated output for the require('fs') calls
	# Because we won't be using the file system anyway, we monkey patch that call
	sed -i '' -e 's/require("fs")/null/g' $(LIBOPUS_JS)
	# disable eslint on the generated javascript
	sed -i '' -e '1s;^;\/* eslint-disable *\/;' ${LIBOPUS_JS}
	# Replace the relative path with an absolute one, necessary to access public files
	#sed -i '' -e 's|$LIBOPUS_WASM|/$LIBOPUS_WASM|' ${LIBOPUS_JS}
	# The generated javascript will try to resolve the path relative to the website directory.  Comment out this line
	#sed -i '' "s|$LIBOPUS_WASM_LOOKUP|// $LIBOPUS_WASM_LOOKUP|" ${LIBOPUS_JS}
	sed -i '' "s|Module|$(LIBOPUS_EXPORT_NAME)|g" ${LIBOPUS_JS}

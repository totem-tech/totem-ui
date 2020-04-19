
# init submodules if not already done (should be done once)
git submodule init
# update submodules recursively
git pull && git submodule sync && git submodule update --init --recursive --remote && \
# Set envirnment variables and run
HTTP_PORT="int: 80" \
HTTPS_PORT="int: 443" \
CertPath="string: /path/to/cert/file.pem" \
KeyPath="string: /path/to/key/file.pem" \
REVERSE_PROXY="string: TRUE" \
yarn run dev # dev: development mode, prod: production mode
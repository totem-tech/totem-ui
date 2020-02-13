
# init submodules if not already done
git submodule init
# update submodules recursively
git submodule update --recursive --remote
# Set envirnment variables and run
HTTP_PORT="int: 80" \
HTTPS_PORT="int: 443" \
CertPath="string: /path/to/cert/file.pem" \
KeyPath="string: /path/to/key/file.pem" \
REVERSE_PROXY="string: TRUE" \
yarn run dev # dev: development mode, prod: production mode
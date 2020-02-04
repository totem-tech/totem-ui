
# init submodules if not already done
git submodule init
# update submodules recursively
git submodule update --recursive --remote
# Set envirnment variables and run
HTTP_PORT="int: 80" \
HTTPS_PORT="int: 443" \
SUBDOMAIN="string: dev" \
EXECUTION_MODE="string: dev" \ 
yarn run dev
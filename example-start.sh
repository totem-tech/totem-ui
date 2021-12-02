
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
PAGES="string: Secondary pages to be served. Expects comma-separated values. Example: `/test-page:/path/to/test/page/dist/directory, /test-page2:/path/to/dir`" \
GIT_PULL_ENDPOINTS="string: configuration to setup endpoints to receive Gitlab webhook calls for pull requests. Example: `suffix1:secret1:/projectsRoot1:project1:project2:project3,suffix2:secret2:/projectsRoot2`" \
yarn run dev # dev: development mode, prod: production mode
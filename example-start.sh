
# init submodules if not already done (should be done once)
git submodule init
# update submodules recursively
git pull && git submodule sync && git submodule update --init --recursive --remote && \
# Set envirnment variables and run
NODE_OPTIONS="--max-old-space-size=8192 --openssl-legacy-provider" \
NODE_ENV="string: Only used when serving pre-compiled dist files. Expected value:'production' or 'developement'" \
HTTP_REDIRECT="string: Only used when serving pre-compiled dist files. Expected values: 'TRUE' or 'FALSE'" \
HTTP_PORT="int: 80" \
HTTPS_PORT="int: 443" \
CertPath="string: /path/to/cert/file.pem" \
KeyPath="string: /path/to/key/file.pem" \
REVERSE_PROXY="string: TRUE" \
PAGES="string: Secondary pages to be served. Expects comma-separated values. Example: `/test-page:/path/to/test/page/dist/directory, /test-page2:/path/to/dir`" \
GIT_PULL_ENDPOINTS="string: configuration to setup endpoints to receive Gitlab webhook calls for pull requests. Example: `suffix1:secret1:/projectsRoot1:project1:project2:project3,suffix2:secret2:/projectsRoot2`" \
yarn run start
##### Available scripts ######
#
# build: compile and generate dist files
#
# buildlang: build list of files for translation purposes
#
# buildlang-watch: build and watch for list of files for translation purposes
#
# serve: serve pre-compiled dist files
#
# start: start application in development mode. Can start with default environment variables by simply running `yarn start`.
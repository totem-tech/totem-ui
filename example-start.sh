
# pull latest changes including all submodules
git pull && git submodule update --recursive --remote && \
_______________DYNAMIC_VARIABLES_BELOW_______________="Changes to variables below DO NOT REQUIRE server restart" \
keyData="string: (96 bytes hex without 0x) exactly as found in the oo7-substrate's secretStore" \
serverName="string: a secret name for the server" \
external_serverName="string: faucet server's name" \
external_publicKey="string: (base64-encoded) 32 byte encryption public key from the faucet server" \
printSensitiveData="string: enable or disable printing of keypair and other sensitive data. To Enable set value to 'YES' (case-sensitive)" \
_______________STATIC_VARIABLES_BELOW_______________="Changes to below variables DO REQUIRE server restart" \
FAUCET_SERVER_URL="string: https://hostname:port" \
STORAGE_PATH="string: ./relative/or/absolute/directory/path/where/server/data/is/stored" \
UI_CERT_PATH="./sslcert/fullchain.pem" \
UI_KEY_PATH="./sslcert/privkey.pem" \
HTTP_PORT="int: 80" \
HTTPS_PORT="int: 443" \
SUBDOMAIN="string: " \
EXECUTION_MODE="string: dev" \ 
CHAT_SERVER_PORT="int 3001" \
yarn run dev
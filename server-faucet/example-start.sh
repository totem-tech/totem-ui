_______________DYNAMIC_VARIABLES_BELOW_______________="Changes to variables below DO NOT REQUIRE server restart" \
amount="int: amount of funds to transfer. Default: 100000" \
uri="string: funding wallet URI" \
keyData="string: (96 bytes hex without 0x) exactly as found in the oo7-substrate's secretStore" \
serverName="string: any name for the server" \
external_publicKey="string-base64-encoded: 32 byte public encryption key from the UI/Chat server" \
external_serverName="string: UI/Chat server's name" \
external_signPublicKey="string-base64-encoded: 32 byte public signing key from the UI/Chat server" \
_______________STATIC_VARIABLES_BELOW_______________="Changes to below variables DO REQUIRE server restart" \
FAUCET_PORT="int: port number" \
FAUCET_CERT_PATH="string: ./path/to/ssl/certificate/key/file" \
FAUCET_KEY_PATH="string: ./path/to/ssl/certificate/private/key/file" \
NODE_URL="string: wss://host.ext.....  Default: 'wss://node1.totem.live'" \
yarn run server-faucet
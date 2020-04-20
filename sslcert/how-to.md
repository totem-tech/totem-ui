# For development:

```bash
cd sslcert
# Use 'localhost' for the 'Common name'
openssl req -new -x509 -sha256 -nodes -newkey rsa:4096 -days 365 -keyout privkey.pem -out fullchain.pem

# Add the cert to your keychain
open fullchain.pem

# you will need to get your OS to trust these certs.
```

To get around permission denied issue: 
```bash
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
```
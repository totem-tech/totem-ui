# For development:

```bash
cd sslcert
openssl req -new -newkey rsa:4096 -nodes -keyout totem.key -out totem.csr
openssl x509 -req -sha256 -days 365 -in totem.csr -signkey totem.key -out fullchain.pem
mv totem.key privkey.pem
rm totem.csr
```

To get around permission denied issue: 
```bash
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
```
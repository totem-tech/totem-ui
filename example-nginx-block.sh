# example nginx server block for main domain and subdomain on the totem network
# Each node.js instance can be executed on the same server with different ports
# The environmental variables for the node server allow you to configure the ports
server {
    listen 80;
    listen [::]:80;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name totem.live www.totem.live;

    if ($scheme != "https") {
       return 301 https://$host$request_uri;
    }

    ssl_certificate                /etc/letsencrypt/live/totem.live/fullchain.pem;
    ssl_certificate_key            /etc/letsencrypt/live/totem.live/privkey.pem;

    ssl_prefer_server_ciphers       on;
    ssl_protocols                   TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers                     "ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-SHA256:AES128-SHA256:AES256-SHA:AES128-SHA:DES-CBC3-SHA:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4";

    charset utf-8;

    access_log                      /var/log/nginx/totem_logs/totem_live/access.log;
    error_log                       /var/log/nginx/totem_logs/totem_live/error.log;

    location / {

        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'Upgrade';
        proxy_set_header Proxy "";
        proxy_set_header Host totem.live;
        proxy_set_header X-Real-IP $remote_addr;

        # Fix the “It appears that your reverse proxy set up is broken" error.
        proxy_pass                    https://127.0.0.1:16181;
        proxy_read_timeout            90;
        proxy_redirect                https://127.0.0.1:16181 https://totem.live;
    }
}
server {
    listen 80;
    listen [::]:80;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dev.totem.live;

    if ($scheme != "https") {
       return 301 https://$host$request_uri;
    }

    ssl_certificate                /etc/letsencrypt/live/dev.totem.live/fullchain.pem;
    ssl_certificate_key            /etc/letsencrypt/live/dev.totem.live/privkey.pem;

    ssl_prefer_server_ciphers       on;
    ssl_protocols                   TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers                     "ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-SHA256:AES128-SHA256:AES256-SHA:AES128-SHA:DES-CBC3-SHA:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4";

    charset utf-8;

    access_log                      /var/log/nginx/totem_logs/totem_live/dev_access.log;
    error_log                       /var/log/nginx/totem_logs/totem_live/dev_error.log;

    location / {

        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'Upgrade';
        proxy_set_header Proxy "";
        proxy_set_header Host dev.totem.live;
        proxy_set_header X-Real-IP $remote_addr;

        # Fix the “It appears that your reverse proxy set up is broken" error.
        proxy_pass                    https://127.0.0.1:16182;
        proxy_read_timeout            90;
        proxy_redirect                https://127.0.0.1:16182 https://dev.totem.live;
    }
}
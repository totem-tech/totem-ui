// http {
//     server {
//         listen 443 ssl;
//         server_name localhost;

//         ssl_certificate /usr/local/etc/nginx/nginx-selfsigned.crt;
//         ssl_certificate_key /usr/local/etc/nginx/nginx-selfsigned.key;

//         location /fca/ {
//             proxy_pass https://connect.fca.org.uk/;
//             proxy_set_header Host $host;
//             proxy_set_header X-Real-IP $remote_addr;
//             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
//             proxy_set_header X-Forwarded-Proto $scheme;

//             # Ensure cookies are forwarded
//             proxy_cookie_path / "/; HTTPOnly; Secure";
//         }
        // location /ch/ {
        //     proxy_pass https://www.gov.uk/government/organisations/companies-house/;
        //     proxy_set_header Host $host;
        //     proxy_set_header X-Real-IP $remote_addr;
        //     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        //     proxy_set_header X-Forwarded-Proto $scheme;

        //     # Ensure cookies are forwarded
        //     proxy_cookie_path / "/; HTTPOnly; Secure";
        // }
//     }
// }
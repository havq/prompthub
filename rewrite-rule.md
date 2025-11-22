# Server Rewrite Rules for BrowserRouter

When using `BrowserRouter`, your web server needs to be configured to handle client-side routing correctly. Single-Page Applications (SPAs) like this one handle routing in the browser's JavaScript. If a user directly accesses a URL like `/post/123` or `/prompt/456`, the server will look for a file or directory at that path and return a 404 error if it doesn't exist.

To fix this, you need to configure your server to redirect all requests for non-existent files to your main `index.html` file. This allows the React application to load and then React Router will handle the URL and display the correct component.

Choose the configuration for your web server below.

---

## Nginx Configuration

For Nginx, add the following `location` block inside your `server` block in your site's configuration file (e.g., `/etc/nginx/sites-available/your-site.conf`).

```nginx
server {
  # ... your other server configurations like listen, server_name, etc.

  root /path/to/your/project/root;
  index index.html;

  location / {
    # This is the crucial part.
    # It tries to serve the requested file, then a directory,
    # and if neither exists, it falls back to serving index.html.
    # For example, a request to your-site.com/prompt/123 will now be correctly handled.
    # This also handles other client-side routes like /category/5, /posts/search/term, or /tag/mytag/date/24h.
    try_files $uri $uri/ /index.html;
  }

  # ... other location blocks for APIs, etc.
}
```

After adding this, save the file and restart Nginx for the changes to take effect:

```bash
sudo systemctl restart nginx
```

---

## Apache Configuration (.htaccess)

For Apache, you need to ensure `mod_rewrite` is enabled. You can usually do this by running `sudo a2enmod rewrite` on Debian/Ubuntu systems.

Then, create or edit the `.htaccess` file in the root directory of your application (the same directory where `index.html` is located) and add the following rules:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Set the base path for your application if it's in a subdirectory
  # If your app is at the root of the domain, this can be just RewriteBase /
  RewriteBase /

  # Don't rewrite the index.html file itself
  RewriteRule ^index\.html$ - [L]

  # If the requested file or directory doesn't exist...
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # ...rewrite the request to index.html to let React Router handle it.
  # For example, a request to your-site.com/prompt/123 will now be correctly handled.
  # This also handles other client-side routes like /category/5, /posts/search/term, or /tag/mytag/date/24h.
  RewriteRule . /index.html [L]
</IfModule>
```

Save the `.htaccess` file. Apache should pick up the changes automatically. If not, you may need to ensure `AllowOverride All` is set for your directory in the main Apache configuration.
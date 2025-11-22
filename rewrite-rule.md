# Server Rewrite Rules for BrowserRouter

When using `BrowserRouter` (Router Mode: Browser), your web server needs to be configured to handle client-side routing correctly. Single-Page Applications (SPAs) like this one handle routing in the browser's JavaScript. If a user directly accesses a URL like `/post/123` or `/prompt/456`, the server will look for a file or directory at that path and return a 404 error if it doesn't exist.

To fix this, you need to configure your server to redirect all requests for non-existent files to your main `index.html` file. This allows the React application to load and then React Router will handle the URL and display the correct component.

If you use `HashRouter`, you do **not** need these configurations.

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
    try_files $uri $uri/ /index.html;
  }

  # ... other location blocks for APIs, etc.
}
```

After adding this, save the file and restart Nginx: `sudo systemctl restart nginx`.

---

## Apache Configuration (.htaccess)

For Apache, ensure `mod_rewrite` is enabled (`sudo a2enmod rewrite`).
Create or edit the `.htaccess` file in the root directory of your application (where `index.html` is) and add:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Set the base path. If app is at root, use /. If in subfolder, use /subfolder/
  RewriteBase /

  # Don't rewrite index.html
  RewriteRule ^index\.html$ - [L]

  # If the requested file or directory doesn't exist...
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # ...rewrite to index.html
  RewriteRule . /index.html [L]
</IfModule>
```

---

## IIS (web.config)

For IIS (Windows Server), create a `web.config` file in your root directory:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## Vercel / Netlify

If you deploy to Vercel or Netlify in the future, create a `vercel.json` or `_redirects` file respectively.

**_redirects (Netlify):**
```
/*  /index.html  200
```

**vercel.json (Vercel):**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

# AdvHub Deployment Guide

This guide provides instructions for deploying your Angular 19 application with Server-Side Rendering (SSR) on a VPS server.

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- A VPS server with SSH access
- Domain name (optional but recommended)

## Environment Setup

1. Create a `.env` file in the root directory of your project with the following variables:

```
# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# WooCommerce Configuration
WOOCOMMERCE_URL=https://your-woocommerce-site.com
WOOCOMMERCE_CONSUMER_KEY=your_woocommerce_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woocommerce_consumer_secret

# Application Configuration
CLIENT_URL=https://your-client-url.com
PORT=4000
NODE_ENV=production
```

## Deployment Options

### Option 1: Interactive Deployment Script (Recommended)

We've included an interactive deployment script that guides you through the process:

```bash
node deploy-to-vps.js
```

This script will:
1. Ask for your server details (host, username, path, etc.)
2. Build the application with SSR
3. Transfer files to your VPS
4. Set up PM2 for process management
5. Configure Nginx (optional)
6. Save your configuration for future deployments

Your configuration will be saved to `deploy-config.json` so you can quickly redeploy with the same settings in the future.

### Option 2: Manual Build and Deployment

1. Install dependencies:
```bash
npm install
```

2. Run the SSR setup script:
```bash
node setup-ssr.js
```

3. Build the application for production with SSR:
```bash
npm run build:ssr
```

This will create the following structure in the `dist/advhub` directory:
- `browser/` - Client-side files
- `server/` - Server-side files including server.mjs

4. Transfer the built application to your VPS:
```bash
scp -r dist/advhub user@your-vps-ip:/path/to/deployment
```

5. SSH into your VPS:
```bash
ssh user@your-vps-ip
```

6. Navigate to the deployment directory:
```bash
cd /path/to/deployment
```

7. Create the `.env` file with your production environment variables:
```bash
nano .env
```

8. Install PM2 for process management (if not already installed):
```bash
npm install -g pm2
```

9. Start the application with PM2:
```bash
pm2 start server/server.mjs --name "advhub"
```

10. Set up PM2 to start on system boot:
```bash
pm2 startup
pm2 save
```

### Option 3: Automated Deployment Script

For automated deployment, you can use the included `deploy.sh` script:

1. Create a `.env` file with your server details:
```
SERVER_HOST=user@your-vps-ip
SERVER_PATH=/path/to/deployment
```

2. Make the script executable:
```bash
chmod +x deploy.sh
```

3. Run the deployment script:
```bash
./deploy.sh
```

## Nginx Configuration

If you're using the interactive deployment script, Nginx configuration can be set up automatically.

For manual configuration:

1. Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/advhub
```

2. Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/advhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Configuration (Optional but Recommended)

To secure your site with HTTPS using Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Troubleshooting

If you encounter any issues with module resolution errors like:
```
Failed to resolve module specifier "zone.js". Relative references must start with either "/", "./", or "../".
```

These are typically caused by incorrect import paths in the server.mjs file. Try these solutions:

1. Run the setup script again to ensure all dependencies are installed:
```bash
node setup-ssr.js
```

2. Check if you have the correct dependencies in package.json:
```
"@angular/platform-server": "^19.0.0",
"@angular/ssr": "^19.0.7",
"@nguniversal/builders": "^19.0.0"
```

3. Make sure your tsconfig.server.json and angular.json files have the correct SSR configurations.

4. If the error persists, try removing the dist folder and rebuilding:
```bash
rm -rf dist
npm run build:ssr
```

### Browser API Errors in SSR

If you see errors related to browser APIs like `window`, `document`, or `localStorage` during SSR, use the platform utility functions:

```typescript
import { isBrowser, runInBrowser } from './app/shared/utils/platform';

// Check if in browser before using browser APIs
if (isBrowser()) {
  window.localStorage.setItem('key', 'value');
}

// Or use the helper function
runInBrowser(() => {
  window.localStorage.setItem('key', 'value');
});
```

## Monitoring and Maintenance

- Monitor the application: `pm2 monit`
- View logs: `pm2 logs advhub`
- Restart the application: `pm2 restart advhub`
- Update the application:
  1. Build the new version locally
  2. Transfer the new build to the server
  3. Replace the files and restart PM2: `pm2 restart advhub` 
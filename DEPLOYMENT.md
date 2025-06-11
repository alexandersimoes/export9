# Deployment Guide - Ubuntu VM

This guide walks you through deploying the Export Game to a Ubuntu VM for production use.

## Prerequisites

- Ubuntu 20.04+ VM with root access
- Domain name (optional but recommended)
- At least 2GB RAM and 20GB storage

## Step 1: Initial Server Setup

### Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Install essential packages
```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

### Create a deployment user (optional but recommended)
```bash
sudo adduser exportgame
sudo usermod -aG sudo exportgame
sudo su - exportgame
```

## Step 2: Install Node.js

### Install Node.js 18+ using NodeSource repository
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Verify installation
```bash
node --version  # Should show v18+
npm --version
```

## Step 3: Install Python

### Install Python 3.10+ and pip
```bash
sudo apt install -y python3 python3-pip python3-venv python3-dev
```

### Verify installation
```bash
python3 --version  # Should show 3.8+
pip3 --version
```

## Step 4: Install and Configure Nginx

### Install Nginx
```bash
sudo apt install -y nginx
```

### Start and enable Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure firewall (if enabled)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable
```

## Step 5: Install PM2 (Process Manager)

### Install PM2 globally
```bash
sudo npm install -g pm2
```

### Setup PM2 to start on boot
```bash
pm2 startup
# Follow the instructions that appear
```

## Step 6: Clone and Setup Application

### Clone the repository
```bash
cd /home/exportgame  # or your preferred directory
git clone https://github.com/alexandersimoes/export9.git
cd export9
```

## Step 7: Backend Setup

### Navigate to backend directory
```bash
cd backend
```

### Create Python virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Python dependencies
```bash
pip install -r requirements.txt
```

### Create production environment file
```bash
cp .env .env.production
nano .env.production
```

Add the following (modify as needed):
```env
REDIS_URL=redis://localhost:6379
DEBUG=False
CORS_ORIGINS=https://yourdomain.com
MAX_PLAYERS_PER_GAME=2
GAME_TIMEOUT_MINUTES=30
```

### Test backend
```bash
python main.py
# Press Ctrl+C to stop
```

## Step 8: Frontend Setup

### Navigate to frontend directory
```bash
cd ../frontend
```

### Install dependencies
```bash
npm install
```

### Build for production
```bash
npm run build
```

### Test production build
```bash
npm start
# Press Ctrl+C to stop
```

## Step 9: Configure PM2 Services

### Create PM2 ecosystem file
```bash
cd /home/exportgame/export9
nano ecosystem.config.js
```

Add the following:
```javascript
module.exports = {
  apps: [
    {
      name: 'export-game-backend',
      script: 'main.py',
      cwd: './backend',
      interpreter: './backend/venv/bin/python',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'export-game-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};
```

### Create logs directory
```bash
mkdir logs
```

### Start services with PM2
```bash
pm2 start ecosystem.config.js
```

### Save PM2 configuration
```bash
pm2 save
```

## Step 10: Configure Nginx Reverse Proxy

### Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/export-game
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API and Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API endpoints
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/export-game /etc/nginx/sites-enabled/
```

### Remove default site (optional)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Test Nginx configuration
```bash
sudo nginx -t
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

## Step 11: Setup SSL with Let's Encrypt (Optional but Recommended)

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Setup automatic renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Step 12: Install Redis (Optional - for scaling)

### Install Redis
```bash
sudo apt install -y redis-server
```

### Configure Redis
```bash
sudo nano /etc/redis/redis.conf
```

Find and modify these lines:
```
supervised systemd
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Restart Redis
```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## Step 13: Monitoring and Logs

### Check PM2 status
```bash
pm2 status
pm2 logs
```

### Check Nginx logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check system resources
```bash
htop
df -h
free -h
```

## Step 14: Maintenance Scripts

### Create update script
```bash
nano /home/exportgame/update-export-game.sh
```

Add:
```bash
#!/bin/bash
cd /home/exportgame/export9

# Pull latest changes
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Update frontend
cd frontend
npm install
npm run build
cd ..

# Restart services
pm2 restart all

echo "Update complete!"
```

### Make it executable
```bash
chmod +x /home/exportgame/update-export-game.sh
```

## Security Best Practices

### 1. Keep system updated
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Configure fail2ban (optional)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 3. Disable root SSH login
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

### 4. Regular backups
Set up automated backups of your application directory and any databases.

## Troubleshooting

### Common Issues:

1. **Services not starting**: Check PM2 logs with `pm2 logs`
2. **Nginx errors**: Check `/var/log/nginx/error.log`
3. **Port conflicts**: Ensure ports 3000 and 8000 are available
4. **Permission errors**: Check file ownership with `ls -la`

### Useful Commands:
```bash
# Restart all services
pm2 restart all

# View real-time logs
pm2 logs --lines 50

# Check service status
pm2 status
sudo systemctl status nginx

# Test application endpoints
curl http://localhost:8000/health
curl http://localhost:3000
```

## Accessing Your Application

Once deployed:
- Frontend: `http://your-domain.com` (or `https://` if SSL configured)
- Backend health check: `http://your-domain.com/health`

The application should now be running in production mode with:
- ✅ Process management with PM2
- ✅ Reverse proxy with Nginx
- ✅ SSL encryption (if configured)
- ✅ Automatic service restart on reboot
- ✅ Log rotation and monitoring

## Performance Optimization

For high traffic:
1. **Enable Redis** for session management
2. **Configure PM2 clustering** for the frontend
3. **Setup load balancing** with multiple backend instances
4. **Add monitoring** with tools like New Relic or Datadog
5. **Implement CDN** for static assets
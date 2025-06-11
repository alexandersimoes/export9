#!/bin/bash

# Export Game Deployment Script for Ubuntu
# Run with: bash deploy.sh

set -e  # Exit on any error

echo "🚀 Starting Export Game deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Get domain name
read -p "Enter your domain name (or leave empty for localhost): " DOMAIN_NAME
if [[ -z "$DOMAIN_NAME" ]]; then
    DOMAIN_NAME="localhost"
fi

print_status "Setting up deployment for domain: $DOMAIN_NAME"

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git build-essential software-properties-common nginx

# Install Node.js
print_status "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Install Python
print_status "Installing Python..."
sudo apt install -y python3 python3-pip python3-venv python3-dev

PYTHON_VERSION=$(python3 --version)
print_status "Python version: $PYTHON_VERSION"

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Setup directory
APP_DIR="$HOME/export9"
if [[ -d "$APP_DIR" ]]; then
    print_warning "Directory $APP_DIR already exists. Updating..."
    cd "$APP_DIR"
    git pull origin main
else
    print_status "Cloning repository..."
    cd "$HOME"
    git clone https://github.com/alexandersimoes/export9.git
    cd export9
fi

# Setup backend
print_status "Setting up backend..."
cd backend

if [[ ! -d "venv" ]]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Create production .env if it doesn't exist
if [[ ! -f ".env" ]]; then
    print_status "Creating backend .env file..."
    cat > .env << EOF
REDIS_URL=redis://localhost:6379
DEBUG=False
CORS_ORIGINS=http://$DOMAIN_NAME,https://$DOMAIN_NAME
MAX_PLAYERS_PER_GAME=2
GAME_TIMEOUT_MINUTES=30
EOF
fi

cd ..

# Setup frontend
print_status "Setting up frontend..."
cd frontend

npm install
npm run build

cd ..

# Create logs directory
mkdir -p logs

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
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
EOF

# Start services with PM2
print_status "Starting services with PM2..."
pm2 delete all 2>/dev/null || true  # Delete existing processes
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
print_status "Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME | grep 'sudo' | bash

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/export-game << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API and Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API endpoints
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/export-game /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
print_status "Testing Nginx configuration..."
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# Create update script
print_status "Creating update script..."
cat > update-export-game.sh << 'EOF'
#!/bin/bash
cd ~/export9

echo "🔄 Updating Export Game..."

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

echo "✅ Update complete!"
EOF

chmod +x update-export-game.sh

# Final status check
print_status "Checking service status..."
sleep 3
pm2 status

# Test endpoints
print_status "Testing application..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "✅ Backend is responding"
else
    print_error "❌ Backend is not responding"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend is responding"
else
    print_error "❌ Frontend is not responding"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Summary:"
echo "  • Frontend: http://$DOMAIN_NAME"
echo "  • Backend health: http://$DOMAIN_NAME/health"
echo "  • Logs: pm2 logs"
echo "  • Status: pm2 status"
echo "  • Update: ./update-export-game.sh"
echo ""
echo "🔧 Next steps:"
echo "  1. Point your domain to this server's IP"
if [[ "$DOMAIN_NAME" != "localhost" ]]; then
    echo "  2. Setup SSL: sudo certbot --nginx -d $DOMAIN_NAME"
fi
echo "  3. Monitor logs: pm2 logs"
echo "  4. Setup monitoring and backups"
echo ""
print_status "Happy gaming! 🎮"
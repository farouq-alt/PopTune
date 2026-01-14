#!/bin/bash

# PopTune Installer for Pop!_OS / Ubuntu / Debian
# This script installs all dependencies, clones the repo, and sets up the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REPO_URL="https://github.com/farouq-alt/PopTune.git"
INSTALL_DIR="$HOME/PopTune"

print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root/sudo"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         PopTune Installer for Linux        ║${NC}"
echo -e "${GREEN}║      Pop!_OS / Ubuntu / Debian             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check for package manager
if ! command -v apt &> /dev/null; then
    print_error "This installer requires apt package manager (Debian/Ubuntu/Pop!_OS)"
    exit 1
fi

# Update package lists
print_status "Updating package lists..."
sudo apt update

# Install system dependencies
print_status "Installing system dependencies..."
sudo apt install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    ffmpeg \
    libsqlite3-dev \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2

# Install libasound2 (package name varies by distro version)
sudo apt install -y libasound2 2>/dev/null || sudo apt install -y libasound2t64 2>/dev/null || true

print_success "System dependencies installed"

# Check and install Node.js
print_status "Checking Node.js installation..."
NODE_VERSION_REQUIRED=18

install_nodejs() {
    print_status "Installing Node.js via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
}

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge "$NODE_VERSION_REQUIRED" ]; then
        print_success "Node.js v$(node -v | cut -d'v' -f2) is already installed"
    else
        print_warning "Node.js version is too old (v$NODE_VERSION). Installing newer version..."
        install_nodejs
    fi
else
    print_warning "Node.js not found. Installing..."
    install_nodejs
fi

# Verify Node.js installation
if ! command -v node &> /dev/null; then
    print_error "Failed to install Node.js"
    exit 1
fi
print_success "Node.js $(node -v) ready"

# Verify npm installation
if ! command -v npm &> /dev/null; then
    print_error "npm not found"
    exit 1
fi
print_success "npm $(npm -v) ready"

# Install yt-dlp
print_status "Installing yt-dlp..."
if command -v yt-dlp &> /dev/null; then
    print_success "yt-dlp is already installed"
else
    if command -v pip3 &> /dev/null; then
        pip3 install --user --upgrade yt-dlp
    else
        print_status "Installing yt-dlp via direct download..."
        sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
        sudo chmod a+rx /usr/local/bin/yt-dlp
    fi
fi

# Verify yt-dlp
if command -v yt-dlp &> /dev/null || [ -f "$HOME/.local/bin/yt-dlp" ]; then
    print_success "yt-dlp installed"
else
    print_warning "yt-dlp may not be in PATH. Add ~/.local/bin to your PATH if needed"
fi

# Verify FFmpeg
print_status "Verifying FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    print_success "FFmpeg $(ffmpeg -version | head -n1 | cut -d' ' -f3) ready"
else
    print_error "FFmpeg installation failed"
    exit 1
fi

# Clone or update repository
print_status "Setting up PopTune repository..."
if [ -d "$INSTALL_DIR" ]; then
    print_status "PopTune directory exists. Updating..."
    cd "$INSTALL_DIR"
    git pull origin main || git pull origin master || print_warning "Could not pull updates"
else
    print_status "Cloning PopTune repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

print_success "Repository ready at $INSTALL_DIR"

# Install npm dependencies
print_status "Installing npm dependencies..."
npm install

print_success "npm dependencies installed"

# Rebuild native modules for Electron
print_status "Rebuilding native modules for Electron..."
npx electron-rebuild

print_success "Native modules rebuilt"

# Build the application
print_status "Building the application..."
npm run build

print_success "Application built successfully"

# Package the application for Linux
print_status "Packaging application (this may take a few minutes)..."

# Check if icon is valid, create a simple one if not
ICON_FILE="$INSTALL_DIR/assets/icon.png"
if ! file "$ICON_FILE" | grep -q "PNG image"; then
    print_warning "Icon file is invalid. Creating a placeholder icon..."
    # Create a simple 256x256 icon using ImageMagick if available, otherwise skip
    if command -v convert &> /dev/null; then
        convert -size 256x256 xc:#1DB954 -fill white -gravity center -pointsize 72 -annotate 0 "PT" "$ICON_FILE"
    else
        # Remove invalid icon so electron-builder uses default
        rm -f "$ICON_FILE"
        print_warning "No icon available. App will use default Electron icon."
    fi
fi

npm run package:linux || {
    print_warning "Packaging failed. Falling back to development mode."
    APPIMAGE=""
}

print_success "Application packaged successfully"

# Find the AppImage
APPIMAGE=$(find "$INSTALL_DIR/release" -name "*.AppImage" -type f | head -n 1)

if [ -z "$APPIMAGE" ]; then
    print_warning "AppImage not found. Using development mode instead."
    LAUNCHER_CMD="cd \"$INSTALL_DIR\" && npm run dev"
else
    # Make AppImage executable
    chmod +x "$APPIMAGE"
    LAUNCHER_CMD="\"$APPIMAGE\""
    print_success "AppImage created: $APPIMAGE"
fi

# Create launcher script
print_status "Creating launcher command..."
mkdir -p "$HOME/.local/bin"

cat > "$HOME/.local/bin/poptune" << EOF
#!/bin/bash
$LAUNCHER_CMD
EOF

chmod +x "$HOME/.local/bin/poptune"
print_success "Launcher created: poptune"

# Add ~/.local/bin to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    export PATH="$HOME/.local/bin:$PATH"
    print_status "Added ~/.local/bin to PATH (restart terminal or run: source ~/.bashrc)"
fi

# Create desktop entry
print_status "Creating desktop shortcut..."
DESKTOP_FILE="$HOME/.local/share/applications/poptune.desktop"
mkdir -p "$HOME/.local/share/applications"

# Use AppImage path directly if available
if [ -n "$APPIMAGE" ]; then
    EXEC_CMD="$APPIMAGE"
else
    EXEC_CMD="$HOME/.local/bin/poptune"
fi

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=PopTune
Comment=YouTube Music Desktop Client
Exec=$EXEC_CMD
Icon=$INSTALL_DIR/assets/icon.png
Terminal=false
Type=Application
Categories=Audio;Music;Player;
StartupWMClass=Tuner
EOF

chmod +x "$DESKTOP_FILE"
print_success "Desktop shortcut created"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Installation Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "PopTune installed to: ${YELLOW}$INSTALL_DIR${NC}"
echo ""
echo -e "To run PopTune:"
echo -e "  • Type ${BLUE}poptune${NC} in terminal"
echo -e "  • Or find ${YELLOW}PopTune${NC} in your application menu"
echo ""
echo -e "${YELLOW}Note:${NC} Restart your terminal or run ${BLUE}source ~/.bashrc${NC} first"
echo ""

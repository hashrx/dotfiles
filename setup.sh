#!/usr/bin/env zsh
set -euo pipefail

# =============================================================================
# Dotfiles Bootstrap Script (macOS)
# =============================================================================

# Constants
DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"
NOTES=()
CURRENT_STEP=""

# =============================================================================
# Cleanup / Error Handling
# =============================================================================

cleanup() {
    if [[ -n "$CURRENT_STEP" ]]; then
        echo "❌ Setup failed during: $CURRENT_STEP"
        echo "   Please resolve the issue and re-run setup.sh"
    fi
}
trap cleanup EXIT

# =============================================================================
# Helper Functions
# =============================================================================

add_note() {
    NOTES+=("$1")
}

# =============================================================================
# Step Functions
# =============================================================================

check_dependencies() {
    CURRENT_STEP="dependency check"
    local missing=()
    for cmd in git make grep tee xattr open; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    if (( ${#missing[@]} > 0 )); then
        echo "❌ Error: Missing required commands: ${missing[*]}"
        exit 1
    fi
    echo "✅ Dependencies verified"
}

init_homebrew() {
    CURRENT_STEP="Homebrew initialization"
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    else
        echo "❌ Error: Homebrew is not installed. Please install it first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    echo "✅ Homebrew initialized"
}

init_submodules() {
    CURRENT_STEP="git submodules"
    git -C "$DOTFILES_DIR" submodule update --init --recursive
    echo "✅ Git submodules initialized"
}

install_stow() {
    CURRENT_STEP="stow installation"
    if command -v stow &>/dev/null; then
        echo "⏭️  Stow already installed"
        add_note "Stow was already installed"
    else
        brew install stow
        echo "✅ Stow installed"
    fi
}

configure_zshenv() {
    CURRENT_STEP="/etc/zshenv configuration"
    if ! grep -q '.config/zsh/.zshenv' /etc/zshenv 2>/dev/null; then
        echo "⚠️  This script will modify /etc/zshenv (requires sudo)"
        sudo tee -a /etc/zshenv >/dev/null <<EOF
[[ -f \$HOME/.config/zsh/.zshenv ]] && source \$HOME/.config/zsh/.zshenv
EOF
        echo "✅ Root zshenv configured"
    else
        echo "⏭️  Root zshenv already configured"
        add_note "Root zshenv was already configured"
    fi
}

create_directories() {
    CURRENT_STEP="directory creation"
    mkdir -p "$HOME/.config" "$HOME/.local/state" "$HOME/.local/share" "$HOME/.local/bin"
    
    # Ensure ~/.ssh exists as a real directory (not a symlink from previous stow)
    # This allows stow to symlink individual files instead of the whole directory
    if [[ -L "$HOME/.ssh" ]]; then
        echo "Converting ~/.ssh from symlink to directory..."
        rm "$HOME/.ssh"
    fi
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
    
    echo "✅ Base directories created"
}

create_symlinks() {
    CURRENT_STEP="symlink creation"
    make -C "$DOTFILES_DIR"
    echo "✅ Symlinks created"
}

configure_git() {
    CURRENT_STEP="Configuring Git"
    
    # Skip if both config files already exist
    if [[ -f "$HOME/.config/git/user" ]] && [[ -f "$HOME/.config/git/work" ]]; then
        echo "⏭️  Git user config already exists"
        return
    fi
    
    echo "Setting up Git user configuration..."
    
    # Prompt for values
    read "git_name?Enter your Git name: "
    read "git_email?Enter your personal Git email: "
    read "git_work_email?Enter your work Git email: "
    
    # Validate required fields
    if [[ -z "$git_name" || -z "$git_email" || -z "$git_work_email" ]]; then
        echo "❌ Error: All fields are required"
        exit 1
    fi
    
    # Sanitize inputs (allow only safe characters)
    git_name="${git_name//[^a-zA-Z0-9 ._-]/}"
    git_email="${git_email//[^a-zA-Z0-9@._+-]/}"
    git_work_email="${git_work_email//[^a-zA-Z0-9@._+-]/}"
    
    # Create personal config (default)
    cat > "$HOME/.config/git/user" << EOF
[user]
    name = $git_name
    email = $git_email
    signingkey = ~/.ssh/id_ed25519.pub
EOF
    
    # Create work config
    cat > "$HOME/.config/git/work" << EOF
[user]
    name = $git_name
    email = $git_work_email
    signingkey = ~/.ssh/id_ed25519.pub
EOF
    
    echo "✅ Git user config created"
    add_note "Git configured: personal ($git_email) and work ($git_work_email)"
}

install_packages() {
    CURRENT_STEP="Homebrew packages installation"
    
    if ! command -v brew &>/dev/null; then
        echo "❌ Error: brew command not found. Homebrew installation may have failed."
        exit 1
    fi
    
$HOME/.local/bin/brew-sync
    echo "✅ Homebrew packages installed"
}

configure_ghostty() {
    CURRENT_STEP="Ghostty configuration"
    
    if [[ -f "$HOME/.config/ghostty/local" ]]; then
        echo "⏭️  Ghostty config already exists"
        add_note "Ghostty config already exists at ~/.config/ghostty/local"
        return
    fi
    
    if [[ -x /opt/homebrew/bin/nu ]]; then
        NU_PATH="/opt/homebrew/bin/nu"
    elif [[ -x /usr/local/bin/nu ]]; then
        NU_PATH="/usr/local/bin/nu"
    else
        NU_PATH="nu"  # fallback to PATH lookup
    fi

    mkdir -p "$HOME/.config/ghostty"
    cat > "$HOME/.config/ghostty/local" << EOF
# Machine-specific Ghostty configuration (generated by setup.sh)
# XDG Base Directory Specification (must use absolute paths)
env = XDG_BIN_HOME=$HOME/.local/bin
env = XDG_CACHE_HOME=$HOME/.cache
env = XDG_CONFIG_HOME=$HOME/.config
env = XDG_DATA_HOME=$HOME/.local/share
env = XDG_STATE_HOME=$HOME/.local/state
command = $NU_PATH
EOF
    echo "✅ Ghostty config generated"
}

init_nushell_plugins() {
    CURRENT_STEP="Initializing nushell plugins"
    local nu_init_path="$HOME/.local/bin/nu-init"
    
    if [[ ! -x "$nu_init_path" ]]; then
        echo "⚠️  Nushell init skipped (nu-init not found)"
        add_note "Nushell init skipped - nu-init script not found"
        return
    fi
    
    if ! "$nu_init_path"; then
        echo "⚠️  Nushell init encountered issues (non-fatal)"
        add_note "Nushell init had issues - run nu-init manually if needed"
    else
        echo "✅ Nushell plugins initialized"
    fi
}

setup_ssh_keys() {
    CURRENT_STEP="SSH setup"
    local setup_ssh_path="$HOME/.local/bin/setup-ssh"
    
    if [[ ! -x "$setup_ssh_path" ]]; then
        echo "⚠️  SSH setup skipped (setup-ssh not found)"
        add_note "SSH setup skipped - setup-ssh script not found"
        return
    fi
    
    if ! "$setup_ssh_path"; then
        echo "⚠️  SSH setup encountered issues (non-fatal)"
        add_note "SSH setup had issues - run setup-ssh manually if needed"
    else
        echo "✅ SSH keys configured"
    fi
}

init_zsh_plugins() {
    CURRENT_STEP="Initializing zsh plugins"
    local zsh_init_path="$HOME/.local/bin/zsh-init"
    
    if [[ ! -x "$zsh_init_path" ]]; then
        echo "⚠️  Zsh init skipped (zsh-init not found)"
        add_note "Zsh init skipped - zsh-init script not found"
        return
    fi
    
    if ! "$zsh_init_path"; then
        echo "⚠️  Zsh init encountered issues (non-fatal)"
        add_note "Zsh init had issues - run zsh-init manually if needed"
    else
        echo "✅ Zsh plugins initialized"
    fi
}

launch_apps() {
    CURRENT_STEP="app launching"
    
    local apps_launched=()
    local apps_missing=()
    
    for app in "AeroSpace" "Mos" "Hidden Bar" "Ghostty"; do
        if [[ -d "/Applications/$app.app" ]]; then
            xattr -d com.apple.quarantine "/Applications/$app.app" 2>/dev/null || true
            open "/Applications/$app.app"
            apps_launched+=("$app")
        else
            apps_missing+=("$app")
        fi
    done
    
    if (( ${#apps_launched[@]} > 0 )); then
        echo "✅ Apps launched (${apps_launched[*]}) - grant permissions when prompted"
    fi
    
    if (( ${#apps_missing[@]} > 0 )); then
        echo "⚠️  Some apps not found: ${apps_missing[*]}"
        add_note "Apps not found in /Applications: ${apps_missing[*]} - install via 'brew install --cask <app>'"
    fi
}

print_summary() {
    echo ""
    if (( ${#NOTES[@]} > 0 )); then
        echo "📋 Notes:"
        for item in "${NOTES[@]}"; do
            echo "   • $item"
        done
        echo ""
    fi
    echo "✅ Setup complete."
}

# =============================================================================
# Main
# =============================================================================

main() {
    check_dependencies
    init_homebrew
    init_submodules
    install_stow
    configure_zshenv
    create_directories
    create_symlinks
    configure_git
    install_packages
    configure_ghostty
    init_zsh_plugins
    init_nushell_plugins
    setup_ssh_keys
    launch_apps
    
    CURRENT_STEP=""  # Clear so cleanup doesn't show error
    print_summary
}

main "$@"

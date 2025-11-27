echo "🛠️ installing stow..."
eval "$(/opt/homebrew/bin/brew shellenv)"
brew install stow
echo "✅ stow installed"

echo "🛠️ creating root zshenv file..."
sudo tee -a /etc/zshenv >/dev/null <<EOF
source \$HOME/.config/zsh/.zshenv
EOF
echo "✅ root zshenv file created"

echo "🛠️ creating base directories..."
mkdir -p "$HOME/.config" "$HOME/.local/state" "$HOME/.local/share" "$HOME/.local/bin"
echo "✅ base directories created"

echo "🛠️ creating symlinks..."
make -f "$HOME/.dotfiles/Makefile"
echo "✅ symlink created"

echo "🛠️ reloading zsh config..."
source "$HOME/.config/zsh/.zshenv"
exec zsh
echo "✅ zsh config reloaded"

echo "🛠️ installing opencode tool dependencies..."

echo "🛠️ installing homebrew packages..."
"$HOME/.local/bin/brew-setup"
echo "✅ homebrew packages installed"

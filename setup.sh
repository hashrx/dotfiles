#!/usr/bin/env zsh
set -e

echo "🛠️ initializing git submodules..."
git -C "$HOME/.dotfiles" submodule update --init --recursive
echo "✅ git submodules initialized"

echo "🛠️ installing stow..."
if [[ -f /opt/homebrew/bin/brew ]]; then
	eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f /usr/local/bin/brew ]]; then
	eval "$(/usr/local/bin/brew shellenv)"
else
	echo "❌ Homebrew not found. Please install it first." >&2
	exit 1
fi
brew install stow
echo "✅ stow installed"

echo "🛠️ creating root zshenv file..."
if ! grep -q '.config/zsh/.zshenv' /etc/zshenv 2>/dev/null; then
	sudo tee -a /etc/zshenv >/dev/null <<EOF
[[ -f \$HOME/.config/zsh/.zshenv ]] && source \$HOME/.config/zsh/.zshenv
EOF
	echo "✅ root zshenv file created"
else
	echo "✅ root zshenv file already configured"
fi

echo "🛠️ creating base directories..."
mkdir -p "$HOME/.config" "$HOME/.local/state" "$HOME/.local/share" "$HOME/.local/bin"
echo "✅ base directories created"

echo "🛠️ creating symlinks..."
make -C "$HOME/.dotfiles"
echo "✅ symlink created"

echo "🛠️ installing homebrew packages..."
"$HOME/.local/bin/brew-setup"
echo "✅ homebrew packages installed"

echo "🛠️ initializing nushell plugins..."
mkdir -p "$HOME/.cache/starship"
zoxide init nushell >"$HOME/.zoxide.nu"
starship init nu >"$HOME/.cache/starship/init.nu"
echo "✅ nushell plugins initialized"

echo "✅ Setup complete. Restart your terminal or run: exec zsh"

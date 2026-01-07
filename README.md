# Dotfiles

This repository hosts configuration files for macOS.

## Requirements

Install Homebrew:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Installation

Clone the repository in your home directory:

```sh
git clone https://github.com/uncrft/dotfiles.git ~/.dotfiles
```

Run the setup script:

```sh
~/.dotfiles/setup.sh
```

## Usage

```sh
# Create or update symlinks
make

# Delete symlinks
make uninstall
```

## Homebrew aliases

```sh
# Install package and update Brewfile
brew add [package]

# Uninstall package and update Brewfile
brew delete [package]

# Clean up installed packages to match Brewfile
brew sync

# Update Brewfile with currently installed packages
brew dump
```

## Keybinding Reference

### Colemak DH Navigation (NEIO instead of HJKL)

This configuration uses Colemak DH keyboard layout. Navigation keys are remapped from QWERTY's HJKL to NEIO:

| QWERTY | Colemak DH | Direction |
| ------ | ---------- | --------- |
| H      | N          | Left      |
| J      | E          | Down      |
| K      | I          | Up        |
| L      | O          | Right     |

### Application-specific navigation

**Neovim** - Window navigation:

- `Ctrl+N` - Focus window left
- `Ctrl+E` - Focus window down
- `Ctrl+I` - Focus window up
- `Ctrl+O` - Focus window right

**AeroSpace** - Window/workspace navigation:

- `Ctrl+Alt+N/E/I/O` - Focus window in direction
- `Alt+Shift+N/E/I/O` - Move window in direction

**Ghostty** - Split navigation:

- `Ctrl+Shift+N` - Focus split left
- `Ctrl+Shift+E` - Focus split down
- `Ctrl+Shift+I` - Focus split up
- `Ctrl+Shift+O` - Focus split right

### Shell keybindings (Zsh and Nushell)

| Keybinding | Zsh | Nushell | Description                |
| ---------- | --- | ------- | -------------------------- |
| `Ctrl+R`   | Yes | Yes     | Fuzzy history search (fzf) |
| `Ctrl+F`   | Yes | Yes     | Fuzzy file finder (fzf)    |
| `Ctrl+E`   | Yes | -       | Fuzzy cd (fzf)             |
| `Ctrl+D`   | -   | Yes     | Fuzzy cd (fzf)             |
| `Ctrl+G*`  | Yes | -       | Git helpers (fzf-git)      |

**fzf-git bindings** (Zsh only, all prefixed with `Ctrl+G`):

- `Ctrl+G Ctrl+F` - Files
- `Ctrl+G Ctrl+B` - Branches
- `Ctrl+G Ctrl+T` - Tags
- `Ctrl+G Ctrl+H` - Commit hashes
- `Ctrl+G Ctrl+R` - Remotes
- `Ctrl+G Ctrl+S` - Stashes

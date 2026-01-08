# Dotfiles

Configuration files for macOS with Colemak DH navigation, dual-shell support (Zsh & Nushell), and TokyoNight theming throughout.

## Features

### Shell (Zsh & Nushell)

| Feature                                           | Zsh    | Nushell  |
| ------------------------------------------------- | ------ | -------- |
| Vi-mode                                           | Yes    | Yes      |
| Starship prompt                                   | Yes    | Yes      |
| Zoxide, Carapace, fnm                             | Yes    | Yes      |
| Autosuggestions                                   | Plugin | Built-in |
| Syntax highlighting                               | Plugin | Built-in |
| fzf: history, files, cd                           | Yes    | Yes      |
| fzf-git keybindings (`Ctrl+G *`)                  | Yes    | -        |
| fzf-git commands (`gsw`, `gls`, `gsha`, `gstash`) | -      | Yes      |
| fzf-tab completions                               | Yes    | -        |

### Apps

- **AeroSpace** - Tiling WM with Colemak DH navigation, workspaces, multi-monitor
- **Ghostty** - TokyoNight theme, transparency, Colemak DH splits, vim scrollback
- **Neovim** - LazyVim, Copilot, OpenCode, Colemak DH, TypeScript/Zig/Nushell
- **Git** - Delta pager, SSH signing, git-branchless, custom aliases

### Utilities

- **Homebrew** - `brew add/delete/sync/dump` to manage Brewfile
- **Setup** - Touch ID for sudo, SSH keygen + GitHub upload, XDG compliance

## Requirements

Install Homebrew:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Installation

Clone the repository:

```sh
git clone https://github.com/uncrft/dotfiles.git ~/.dotfiles
```

Run the setup script:

```sh
~/.dotfiles/setup.sh
```

The script will prompt for your Git name and email addresses. Personal email is used globally, work email is used in `~/Developer/work`.

> **Note:** The script requires `sudo` for:
>
> - `/etc/zshenv` - Source XDG-compliant zsh config from the system-wide zshenv
> - `/etc/pam.d/sudo_local` - Enable Touch ID for sudo authentication

## Usage

```sh
# Create or update symlinks (from anywhere)
dotfiles

# Or from the repo
make
make uninstall

# Regenerate shell caches after tool updates
zsh-init
nu-init

# Setup SSH key and upload to GitHub
setup-ssh

# Homebrew package management
brew add <package>     # Install and update Brewfile
brew delete <package>  # Uninstall and update Brewfile
brew sync              # Clean up to match Brewfile
brew dump              # Update Brewfile with installed packages
```

## Keybinding Reference

### Colemak DH

This configuration uses Colemak DH keyboard layout. Navigation keys are remapped from QWERTY's HJKL to NEIO:

| QWERTY | Colemak DH | Direction |
| ------ | ---------- | --------- |
| H      | N          | Left      |
| J      | E          | Down      |
| K      | I          | Up        |
| L      | O          | Right     |

### Application-specific navigation

**Neovim** - Window navigation:

- `Ctrl+N/E/I/O` - Focus window in direction

**AeroSpace** - Window/workspace navigation:

- `Ctrl+Alt+N/E/I/O` - Focus window in direction
- `Alt+Shift+N/E/I/O` - Move window in direction

**Ghostty** - Split navigation:

- `Ctrl+Shift+N/E/I/O` - Focus split in direction

### fzf-git bindings (Zsh only)

All prefixed with `Ctrl+G`:

- `Ctrl+G Ctrl+F` - Files
- `Ctrl+G Ctrl+B` - Branches
- `Ctrl+G Ctrl+T` - Tags
- `Ctrl+G Ctrl+H` - Commit hashes
- `Ctrl+G Ctrl+R` - Remotes
- `Ctrl+G Ctrl+S` - Stashes

> **Note:** Nushell does not support key sequences, so fzf-git bindings are not available. Use the CLI alternatives instead: `gsw` (switch branch), `gls` (files), `gsha` (commit hashes), `gstash` (stashes).

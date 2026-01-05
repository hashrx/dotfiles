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
make clean
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

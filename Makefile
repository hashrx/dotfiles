.PHONY: all uninstall

all:
	stow --dotfiles -v -R -t ~ .

# Remove symlinks from home directory
uninstall:
	stow --dotfiles -v -D -t ~ .

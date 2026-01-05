.PHONY: all clean

all:
	stow --dotfiles -v -R .

clean:
	stow --dotfiles -v -D .

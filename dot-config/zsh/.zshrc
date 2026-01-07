source "$XDG_CONFIG_HOME/zsh/plugins/zsh-defer/zsh-defer.plugin.zsh"

alias p="pnpm"
alias g="git"
alias ls="eza"
alias v="nvim"
alias vi="nvim"
alias vim="nvim"
alias dotfiles="make -C ~/.dotfiles"

# HISTFILE, HISTSIZE, and SAVEHIST must be set here (not .zshenv) because macOS /etc/zshrc overwrites it
export HISTFILE="$XDG_STATE_HOME/zsh_history"
export HISTSIZE=10000
export SAVEHIST=10000

eval "$(starship init zsh)"

zstyle ':completion:*' cache-path "$XDG_CACHE_HOME/zsh/zcompcache"
zstyle ':completion:*:descriptions' format '[%d]'
zstyle ':completion:*:git-checkout:*' sort false
zstyle ':fzf-tab:*' fzf-bindings 'ctrl-y:accept'
zstyle ':fzf-tab:*' fzf-flags --style=full --height=-2
zstyle ':fzf-tab:*' switch-group 'ctrl-n' 'ctrl-o'
zstyle ':fzf-tab:*' prefix ''
zstyle ':fzf-tab:complete:(eza|cd|bat):*' fzf-preview 'less $realpath'

autoload -Uz up-line-or-beginning-search
autoload -Uz down-line-or-beginning-search
autoload -Uz compinit

fpath=($HOMEBREW_PREFIX/share/zsh-completions $XDG_CONFIG_HOME/zsh/completions $fpath)

if [[ -n $GHOSTTY_RESOURCES_DIR ]]; then
  source "$GHOSTTY_RESOURCES_DIR"/shell-integration/zsh/ghostty-integration
fi

# Workaround for man x fast-syntax-highlighting freeze
# See https://github.com/zdharma-continuum/fast-syntax-highlighting/issues/27#issuecomment-1267278072
function whatis() { if [[ -v THEFD ]]; then :; else command whatis "$@"; fi; }

[[ -f "$HOMEBREW_PREFIX/opt/zsh-vi-mode/share/zsh-vi-mode/zsh-vi-mode.plugin.zsh" ]] && zsh-defer source "$HOMEBREW_PREFIX/opt/zsh-vi-mode/share/zsh-vi-mode/zsh-vi-mode.plugin.zsh"
[[ -f "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh" ]] && zsh-defer source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
[[ -f "$HOMEBREW_PREFIX/opt/zsh-fast-syntax-highlighting/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh" ]] && zsh-defer source "$HOMEBREW_PREFIX/opt/zsh-fast-syntax-highlighting/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh"

zsh-defer eval "$(fnm env --use-on-cd --corepack-enabled --resolve-engines --version-file-strategy=recursive --shell zsh)"
zsh-defer eval "$(zoxide init zsh)"

zsh-defer zle -N up-line-or-beginning-search
zsh-defer zle -N down-line-or-beginning-search

# Ensure cache directory exists for completion dump
mkdir -p "${XDG_CACHE_HOME:-$HOME/.cache}/zsh"
zsh-defer compinit -u -d "${XDG_CACHE_HOME:-$HOME/.cache}/zsh/zcompdump"
zsh-defer source "$XDG_CONFIG_HOME/zsh/plugins/fzf-tab/fzf-tab.plugin.zsh"
zsh-defer source "$XDG_CONFIG_HOME/zsh/plugins/fzf-git/fzf-git.sh"

zsh-defer export LS_COLORS="$(vivid generate tokyonight-night)"

# Key bindings (insert mode only)
function zvm_after_init() { 
  source <(fzf --zsh)

  zvm_bindkey viins '^B' clear-screen
  zvm_bindkey viins '^N' up-line-or-beginning-search
  zvm_bindkey viins '^P' down-line-or-beginning-search
  zvm_bindkey viins '^Y' autosuggest-accept

  # fzf bindings
  zvm_bindkey viins '^E' fzf-cd-widget
  zvm_bindkey viins '^F' fzf-file-widget
  zvm_bindkey viins '^R' fzf-history-widget

  # Set insert mode keybindings for fzf-git.sh
  # https://github.com/junegunn/fzf-git.sh/issues/23
  for o in files branches tags remotes hashes stashes lreflogs each_ref; do
    eval "zvm_bindkey viins '^g^${o[1]}' fzf-git-$o-widget"
    eval "zvm_bindkey viins '^g${o[1]}' fzf-git-$o-widget"
  done
}

# Lazy keybindings (visual and command mode)
function zvm_after_lazy_keybindings() {
  zvm_bindkey vicmd '^B' clear-screen
  zvm_bindkey vicmd '^N' up-line-or-beginning-search
  zvm_bindkey vicmd '^P' down-line-or-beginning-search
  zvm_bindkey vicmd '^Y' autosuggest-accept

  # fzf bindings
  zvm_bindkey vicmd '^E' fzf-cd-widget
  zvm_bindkey vicmd '^F' fzf-file-widget
  zvm_bindkey vicmd '^R' fzf-history-widget

  # Set normal and visual modes keybindings for fzf-git.sh
  # https://github.com/junegunn/fzf-git.sh/issues/23
  for o in files branches tags remotes hashes stashes lreflogs each_ref; do
    eval "zvm_bindkey vicmd '^g^${o[1]}' fzf-git-$o-widget"
    eval "zvm_bindkey vicmd '^g${o[1]}' fzf-git-$o-widget"
    eval "zvm_bindkey visual '^g^${o[1]}' fzf-git-$o-widget"
    eval "zvm_bindkey visual '^g${o[1]}' fzf-git-$o-widget"
  done
}

function repo() {
  if ! git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    echo "Not a git repository" >&2
    return 1
  fi

  cd "$git_root"
}

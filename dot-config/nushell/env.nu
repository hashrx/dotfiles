# env.nu
#
# Environment configuration for Nushell
# Loaded before config.nu and login.nu
#
# This file sets up XDG directories and environment variables

##
# Homebrew environment
##
# Initialize Homebrew environment
$env.HOMEBREW_PREFIX = "/opt/homebrew"
$env.HOMEBREW_CELLAR = "/opt/homebrew/Cellar"
$env.HOMEBREW_REPOSITORY = "/opt/homebrew"
$env.MANPATH = $"/opt/homebrew/share/man($env.MANPATH? | default '' | prepend ':')"
$env.INFOPATH = $"/opt/homebrew/share/info($env.INFOPATH? | default '' | prepend ':')"
$env.GIT_UNSTCK_PATH = "/Users/maxime.doury/Developer/experiments/git-unstck/zig-out/bin"

##
# Define the path to the dotfiles directory
##
$env.DOTFILES = ($env.DOTFILES? | default ($env.HOME | path join ".dotfiles"))

##
# XDG Base Directory Specification
# https://specifications.freedesktop.org/basedir-spec/latest/#variables
##
$env.XDG_BIN_HOME = ($env.XDG_BIN_HOME? | default ($env.HOME | path join ".local" "bin"))
$env.XDG_CACHE_HOME = ($env.XDG_CACHE_HOME? | default ($env.HOME | path join "Library" "Caches"))
$env.XDG_CONFIG_HOME = ($env.XDG_CONFIG_HOME? | default ($env.HOME | path join ".config"))
$env.XDG_CONFIG_DIRS = ($env.XDG_CONFIG_DIRS? | default "/etc/xdg")
$env.XDG_DATA_HOME = ($env.XDG_DATA_HOME? | default ($env.HOME | path join ".local" "share"))
$env.XDG_DATA_DIRS = ($env.XDG_DATA_DIRS? | default "/usr/local/share/:/usr/share/")
$env.XDG_RUNTIME_DIR = ($env.XDG_RUNTIME_DIR? | default ($env.TMPDIR | default "/tmp" | path join $"runtime-($env.UID? | default (id -u | str trim))"))
$env.XDG_STATE_HOME = ($env.XDG_STATE_HOME? | default ($env.HOME | path join ".local" "state"))

##
# XDG User Directories
# https://wiki.archlinux.org/title/XDG_user_directories
##
$env.XDG_DESKTOP_DIR = ($env.XDG_DESKTOP_DIR? | default ($env.HOME | path join "Desktop"))
$env.XDG_DOCUMENTS_DIR = ($env.XDG_DOCUMENTS_DIR? | default ($env.HOME | path join "Documents"))
$env.XDG_DOWNLOAD_DIR = ($env.XDG_DOWNLOAD_DIR? | default ($env.HOME | path join "Downloads"))
$env.XDG_MUSIC_DIR = ($env.XDG_MUSIC_DIR? | default ($env.HOME | path join "Music"))
$env.XDG_PICTURES_DIR = ($env.XDG_PICTURES_DIR? | default ($env.HOME | path join "Pictures"))
$env.XDG_PUBLICSHARE_DIR = ($env.XDG_PUBLICSHARE_DIR? | default ($env.HOME | path join "Public"))
$env.XDG_VIDEOS_DIR = ($env.XDG_VIDEOS_DIR? | default ($env.HOME | path join "Movies"))

##
# Tool-specific environment variables with partial XDG support
# https://wiki.archlinux.org/title/XDG_Base_Directory#Partial
##
$env.CARGO_HOME = ($env.XDG_DATA_HOME | path join "cargo")
$env.DOCKER_CONFIG = ($env.XDG_CONFIG_HOME | path join "docker")
$env.FFMPEG_DATADIR = ($env.XDG_CONFIG_HOME | path join "ffmpeg")
$env.GNUPGHOME = ($env.XDG_CONFIG_HOME | path join "gnupg")
$env.LESSHISTFILE = ($env.XDG_STATE_HOME | path join "less_history")
$env.MACHINE_STORAGE_PATH = ($env.XDG_DATA_HOME | path join "docker_machine")
$env.MYPY_CACHE_DIR = ($env.XDG_CACHE_HOME | path join "mypy")
$env.NODE_REPL_HISTORY = ($env.XDG_STATE_HOME | path join "node_repl_history")
$env.NPM_CONFIG_CACHE = ($env.XDG_CACHE_HOME | path join "npm")
$env.NPM_CONFIG_USERCONFIG = ($env.XDG_CONFIG_HOME | path join "npm" "config")
$env.NVM_DIR = ($env.XDG_DATA_HOME | path join "nvm")
$env.PYENV_ROOT = ($env.XDG_DATA_HOME | path join "pyenv")
$env.PYTHONPYCACHEPREFIX = ($env.XDG_CACHE_HOME | path join "python")
$env.PYTHONUSERBASE = ($env.XDG_DATA_HOME | path join "python")
$env.PYTHON_HISTORY = ($env.XDG_STATE_HOME | path join "python_history")
$env.RUSTUP_HOME = ($env.XDG_DATA_HOME | path join "rustup")
$env.WORKON_HOME = ($env.XDG_DATA_HOME | path join "virtualenvs")

##
# General environment variables
##
$env.EDITOR = "nvim"
$env.LESSOPEN = "|~/.lessfilter %s"
$env.CLICOLOR = "1"
$env.TURBO_UI = "true"
$env.AWS_PROFILE = "ClaudeCode"
$env.FD_IGNORE_FILE = ($env.HOME | path join ".config" "fd" "ignore")
$env.FZF_DEFAULT_COMMAND = "fd --type f --hidden --follow --exclude .git"
$env.FZF_DEFAULT_OPTS = "--style full --prompt '❯ ' --bind 'ctrl-d:half-page-down,ctrl-u:half-page-up' --cycle"

# Use Nushell-specific starship config (with character module disabled)
$env.STARSHIP_CONFIG = ($env.HOME | path join ".config" "starship-nu.toml")

##
# PATH configuration
##
# Add XDG_BIN_HOME to PATH if not already present
$env.PATH = (
    $env.PATH 
    | split row (char esep)
    | prepend $env.XDG_BIN_HOME
    | prepend ($env.CARGO_HOME | path join "bin")
    | prepend "/opt/homebrew/bin"
    | prepend "/opt/homebrew/sbin"
    | prepend $env.GIT_UNSTCK_PATH
    | uniq
)

##
# PNPM configuration
##
$env.PNPM_HOME = ($env.HOME | path join ".local" "share" "pnpm")
$env.PATH = ($env.PATH | prepend $env.PNPM_HOME | uniq)

##
# fnm (Fast Node Manager) configuration
##
# Load all fnm environment variables at once
fnm env --json | from json | load-env
$env.PATH = ($env.PATH | prepend ($env.FNM_MULTISHELL_PATH | path join "bin") | uniq)

##
# LS_COLORS configuration with vivid
##
$env.LS_COLORS = (vivid generate tokyonight-night)

##
# Carapace completion setup
##
$env.CARAPACE_BRIDGES = 'zsh,fish,bash,inshellisense'
mkdir ($nu.cache-dir)
carapace _carapace nushell | save --force $"($nu.cache-dir)/carapace.nu"

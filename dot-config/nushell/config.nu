# config.nu
#
# Main configuration for Nushell
# Loaded after env.nu and before login.nu
#
# See https://www.nushell.sh/book/configuration.html

# Disable welcome banner
$env.config.show_banner = false

# Enable vi-mode
$env.config.edit_mode = "vi"

# Cursor shape configuration for vi-mode
$env.config.cursor_shape = {
    vi_insert: line      # thin line for insert mode
    vi_normal: block     # block/square for normal mode
    emacs: line          # thin line for emacs mode (fallback)
}

# Source carapace completions
source $"($nu.cache-dir)/carapace.nu"

# Source zoxide (smart directory jumping)
# Requires: zoxide init nushell > $"($nu.cache-dir)/zoxide.nu"
# Note: nushell's `source` requires literal paths, conditional sourcing is not supported
source $"($nu.cache-dir)/zoxide.nu"

##
# Starship Prompt
##
# Starship prompt integration
# Requires: starship init nu > $"($nu.cache-dir)/starship.nu"
# Note: nushell's `source` requires literal paths, conditional sourcing is not supported
# We've disabled starship's character module to use Nushell's vi-mode aware indicators
source $"($nu.cache-dir)/starship.nu"

# Custom vi-mode indicators that change based on mode and exit code
# Insert mode: ❯ (green on success, red on error)
# Normal mode: ❮ (green on success, red on error)
$env.PROMPT_INDICATOR_VI_INSERT = {||
    if $env.LAST_EXIT_CODE == 0 {
        $"(ansi '#4FD6BE')❯(ansi reset) "
    } else {
        $"(ansi red)❯(ansi reset) "
    }
}

$env.PROMPT_INDICATOR_VI_NORMAL = {||
    if $env.LAST_EXIT_CODE == 0 {
        $"(ansi '#4FD6BE')❮(ansi reset) "
    } else {
        $"(ansi red)❮(ansi reset) "
    }
}

# Emacs mode (fallback)
$env.PROMPT_INDICATOR = {||
    if $env.LAST_EXIT_CODE == 0 {
        $"(ansi '#4FD6BE')❯(ansi reset) "
    } else {
        $"(ansi red)❯(ansi reset) "
    }
}

##
# Aliases
##
alias p = pnpm
alias g = git
# alias ls = eza
alias v = nvim
alias vi = nvim
alias vim = nvim
alias unstck = git-unstck
alias stck = git-unstck

##
# Custom Commands
##
# Run dotfiles Makefile targets from anywhere
def dotfiles [
    target?: string  # Makefile target (default: all)
] {
    let t = ($target | default "all")
    make -C ~/.dotfiles $t
}

# Jump to git repository root
def --env repo [] {
    let result = (git rev-parse --show-toplevel | complete)
    if $result.exit_code != 0 {
        error make {msg: "Not a git repository"}
    }
    cd ($result.stdout | str trim)
}

##
# Hooks
##
# fnm: Auto-switch Node version on directory change
# --version-file-strategy=recursive: looks for .nvmrc/.node-version/package.json in parent dirs (monorepo support)
# --silent-if-unchanged: suppresses output when version doesn't change or no version file exists
$env.config.hooks.env_change.PWD = ($env.config.hooks.env_change.PWD? | default [] | append {
    code: "fnm use --silent-if-unchanged"
})

##
# Completion Menu Configuration
##
$env.config.menus ++= [{
    name: completion_menu
    only_buffer_difference: false
    marker: $"(ansi '#bb9af7')❯(ansi reset) "
    type: {
        layout: columnar
        columns: 4
        col_width: 20
        col_padding: 2
    }
    style: {
        text: green
        selected_text: { fg: "#4FD6BE" attr: r }
        description_text: "#4FD6BE"
    }
}]

##
# History Menu Configuration
##
$env.config.menus ++= [{
    name: history_menu
    only_buffer_difference: true
    marker: $"(ansi '#bb9af7')❯(ansi reset) "
    type: {
        layout: list
        page_size: 15
    }
    style: {
        text: green
        selected_text: { fg: "#4FD6BE" attr: r }
        description_text: "#4FD6BE"
    }
}]

##
# Keybindings
##
$env.config.keybindings ++= [
    # Ctrl+Y: Accept completion
    {
        name: accept_completion
        modifier: control
        keycode: char_y
        mode: [vi_insert vi_normal]
        event: { send: enter }
    }
    # Ctrl+B: Clear screen
    {
        name: clear_screen
        modifier: control
        keycode: char_b
        mode: [vi_insert vi_normal]
        event: { send: clearscreen }
    }
    # Ctrl+R: FZF history search
    {
        name: fuzzy_history
        modifier: control
        keycode: char_r
        mode: [vi_insert vi_normal]
        event: [
            {
                send: ExecuteHostCommand
                cmd: "do {
                    $env.SHELL = $'($env.HOMEBREW_PREFIX)/bin/bash'
                    commandline edit --insert (
                        history
                        | get command
                        | reverse
                        | uniq
                        | str join (char -i 0)
                        | fzf --scheme=history 
                            --read0
                            --layout=reverse
                            --height=40%
                            --bind 'ctrl-/:change-preview-window(right,70%|hidden|right)'
                            --preview='echo -n {} | nu --stdin -c \'nu-highlight\''
                        | decode utf-8
                        | str trim
                    )
                }"
            }
        ]
    }
    # Ctrl+F: FZF file finder
    {
        name: fuzzy_file
        modifier: control
        keycode: char_f
        mode: [vi_insert vi_normal]
        event: [
            {
                send: ExecuteHostCommand
                cmd: "commandline edit --insert (fd --type f --hidden --follow --full-path --exclude .git | fzf --preview 'bat --color=always --style=numbers --line-range :500 {}' --bind 'ctrl-/:toggle-preview')"
            }
        ]
    }
    # Ctrl+E: FZF directory finder and cd
    {
        name: fuzzy_cd
        modifier: control
        keycode: char_e
        mode: [vi_insert vi_normal]
        event: [
            {
                send: ExecuteHostCommand
                cmd: "cd (fd --type d --hidden --follow --full-path --exclude .git | fzf --preview 'eza --tree --level=2 --color=always {}' --bind 'ctrl-/:toggle-preview')"
            }
        ]
    }
]

##
# Git FZF Commands
##
# Git branch switcher
def gsw [] {
    let branch = (
        git branch --sort=-committerdate --color=always
        | fzf --ansi
            --header 'Local | ALT-A: all | ALT-L: local | ALT-R: remote'
            --preview 'git log --oneline --graph --date=short --color=always --pretty="format:%C(auto)%cd %h%d %s" $(echo {} | sed "s/^[* ]*//" | awk "{print \$1}") 2>/dev/null | head -50'
            --preview-window 'down,border-top,40%'
            --bind 'ctrl-/:change-preview-window(down,70%|hidden|)'
            --bind 'alt-a:change-header(All | ALT-A: all | ALT-L: local | ALT-R: remote)+reload(git branch --all --sort=-committerdate --color=always)'
            --bind 'alt-l:change-header(Local | ALT-A: all | ALT-L: local | ALT-R: remote)+reload(git branch --sort=-committerdate --color=always)'
            --bind 'alt-r:change-header(Remote | ALT-A: all | ALT-L: local | ALT-R: remote)+reload(git branch --remote --sort=-committerdate --color=always)'
        | str trim
        | str replace '^\\* ' ''
        | str replace '^\s+' ''
        | split row ' '
        | first
        | str replace 'remotes/origin/' ''
        | str replace 'origin/' ''
    )
    
    if ($branch | is-empty) {
        return
    }
    
    git switch $branch
}

# Git file browser (shows modified files first, then all tracked files)
def gls [] {
    commandline edit --insert (
        ^sh -c 'git status --short --no-branch | sed "s/^[[:space:]]*[[:alnum:]?!]*[[:space:]]*//"; git ls-files' 2>/dev/null
        | fzf -m
            --header 'ALT-E: open in editor | Modified files shown first'
            --preview 'if [ -d {} ]; then eza --tree --level=2 --color=always {}; elif git diff --quiet HEAD -- {} 2>/dev/null; then bat --color=always --style=numbers --line-range :500 {}; else git diff --color=always -- {}; fi'
            --bind 'ctrl-/:toggle-preview'
            --bind 'alt-e:execute(nvim {} > /dev/tty)'
    )
}

# Git commit sha browser (no graph, just commits)
def gsha [] {
    commandline edit --insert (
        ^git log --oneline --color=always --all
        | fzf --ansi --no-sort
            --header 'CTRL-D: show diff | CTRL-S: toggle sort'
            --preview 'echo {} | grep -o "[a-f0-9]\{7,\}" | head -n 1 | xargs git show --color=always 2>/dev/null'
            --bind 'ctrl-/:toggle-preview'
            --bind 'ctrl-s:toggle-sort'
            --bind 'ctrl-d:execute(echo {} | grep -o "[a-f0-9]\{7,\}" | head -n 1 | xargs git show 2>/dev/null)'
        | str trim
        | parse --regex '(?P<hash>[a-f0-9]{7,})'
        | get hash.0?
        | default ""
    )
}

# Git stash browser
def gstash [] {
    let stash = (
        git stash list
        | fzf -d: 
            --header 'CTRL-X: drop stash'
            --preview 'echo {} | cut -d: -f1 | xargs git stash show -p --color=always'
            --bind 'ctrl-/:toggle-preview'
            --bind 'ctrl-x:reload(git stash drop -q {1}; git stash list)'
        | cut -d: -f1
    )
    if ($stash | is-not-empty) {
        git stash apply $stash
    }
}


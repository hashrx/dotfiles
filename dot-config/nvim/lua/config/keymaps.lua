-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
-- Move to window using the <ctrl> hjkl keys

local map = LazyVim.safe_keymap_set

-- Jump list navigation (since <C-i>/<C-o> are used for window navigation)
map("n", "[j", "<C-o>", { desc = "Jump to older position" })
map("n", "]j", "<C-i>", { desc = "Jump to newer position" })

-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
-- Move to window using the <ctrl> hjkl keys

local map = LazyVim.safe_keymap_set

map("n", "<C-n>", "<C-w>h", { desc = "Go to Left Window", remap = true })
map("n", "<C-e>", "<C-w>j", { desc = "Go to Lower Window", remap = true })
map("n", "<C-i>", "<C-w>k", { desc = "Go to Upper Window", remap = true })
map("n", "<C-o>", "<C-w>l", { desc = "Go to Right Window", remap = true })

-- Jump list navigation (since <C-i>/<C-o> are used for window navigation)
map("n", "[j", "<C-o>", { desc = "Jump to older position" })
map("n", "]j", "<C-i>", { desc = "Jump to newer position" })

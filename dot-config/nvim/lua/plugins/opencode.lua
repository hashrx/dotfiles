return {
  {
    "NickvanDyke/opencode.nvim",
    dependencies = {
      { "folke/snacks.nvim" },
    },
    config = function()
      ---@type opencode.Opts
      vim.g.opencode_opts = {
        -- Your configuration, if any — see `lua/opencode/config.lua`, or "goto definition".
      }

      -- Required for `opts.auto_reload`.
      vim.o.autoread = true

      vim.keymap.set({ "n", "x" }, "<C-a>", function()
        require("opencode").ask("@this: ", { submit = true })
      end, { desc = "Ask opencode" })
      vim.keymap.set({ "n", "x" }, "<C-x>", function()
        require("opencode").select()
      end, { desc = "Execute opencode action…" })
      vim.keymap.set({ "n", "x" }, "ga", function()
        require("opencode").prompt("@this")
      end, { desc = "Add to opencode" })
      vim.keymap.set({ "n", "t" }, "<C-.>", function()
        require("opencode").toggle()
      end, { desc = "Toggle opencode" })
      vim.keymap.set({ "n", "t" }, "<S-C-u>", function()
        require("opencode").command("session.half.page.up")
      end, { desc = "opencode half page up" })
      vim.keymap.set({ "n", "t" }, "<S-C-d>", function()
        require("opencode").command("session.half.page.down")
      end, { desc = "opencode half page down" })
    end,
    -- keys = {
    --   {
    --     "<leader>o",
    --     function()
    --       require("opencode").ask("@this: ", { submit = true })
    --     end,
    --     mode = { "n", "x" },
    --     desc = "Ask opencode",
    --   },
    --   {
    --     "<leader>O",
    --     function()
    --       require("opencode").select()
    --     end,
    --     mode = { "n", "x" },
    --     desc = "Execute opencode action…",
    --   },
    --   {
    --     "ga",
    --     function()
    --       require("opencode").prompt("@this")
    --     end,
    --     mode = { "n", "x" },
    --     desc = "Add to opencode",
    --   },
    --   {
    --     "<C-.>",
    --     function()
    --       require("opencode").toggle()
    --     end,
    --     mode = { "n", "t" },
    --     desc = "Toggle opencode",
    --   },
    --   {
    --     "<S-C-u>",
    --     function()
    --       require("opencode").command("session.half.page.up")
    --     end,
    --     desc = "opencode half page up",
    --   },
    --   {
    --     "<S-C-d>",
    --     function()
    --       require("opencode").command("session.half.page.down")
    --     end,
    --     desc = "opencode half page down",
    --   },
    -- },
  },
}

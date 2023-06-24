---
title: 包管理工具 Mac Homebrew 使用经验
categories: 问题日志
toc: true
abbrlink: bdbce9d
date: 2023-06-24 20:28:32
tags:
sticky:
---

<!-- more -->

## Git 拉取Gitee仓库报错：“fatal: unable to access ''": Failed to connect to 127.0.0.1 port 1080: Connection refused”

```zsh
➜  my-docs git:(main) ✗ brew update
fatal: unable to access 'https://gitee.com/cunkai/homebrew-services.git/': Unsupported proxy syntax in '<127.0.0.1>:<7890>'
Error: Fetching /opt/homebrew/Library/Taps/homebrew/homebrew-services failed!
```

解决办法

```zsh
# 本地查看是否 Git 使用了代理
git config --global http.proxy

# 如果有代理，取消代理
git config --global --unset http.proxy
```

结果
```zsh
➜  my-docs git:(main) ✗ brew update
Already up-to-date.
```

## 把mac的终端改为oh-my-zsh之后输入brew命令输出zsh: command not found: brew。

确认 Homebrew 安装：请确保已经正确安装了 Homebrew。你可以尝试在终端中运行 `brew` 命令来验证。如果没有正确安装，你可以按照 Homebrew 的官方文档进行安装步骤。

检查环境变量：Oh My Zsh 可能没有正确加载你的环境变量。你可以检查 `~/.zshrc` 文件，确保以下几行代码存在：
```zsh
export PATH="/opt/homebrew/bin:$PATH"
export PATH="/opt/homebrew/sbin:$PATH"

# 修改了 ~/.zshrc 文件之后，需要刷新终端
# 也可以关闭终端窗口并重新打开
source ~/.zshrc
```

我的brew安装目录是/opt/homebrew


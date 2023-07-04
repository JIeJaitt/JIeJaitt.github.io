---
title: 包管理工具 Mac Homebrew 使用经验
categories: 问题日志
toc: true
abbrlink: bdbce9d
date: 2023-06-24 20:28:32
tags:
sticky:
---

brew的配置不可谓不艰难，包管理工具 Mac Homebrew 使用经验。由于我使用的是m1的mac，网上的教程比较少，所以纯靠自己摸索

<!-- more -->

## Git 拉取Gitee仓库报错：“fatal: unable to access ''": Failed to connect to 127.0.0.1 port 1080: Connection refused”

```bash
➜  my-docs git:(main) ✗ brew update
fatal: unable to access 'https://gitee.com/cunkai/homebrew-services.git/': Unsupported proxy syntax in '<127.0.0.1>:<7890>'
Error: Fetching /opt/homebrew/Library/Taps/homebrew/homebrew-services failed!
```

解决办法

```bash
# 本地查看是否 Git 使用了代理
git config --global http.proxy

# 如果有代理，取消代理
git config --global --unset http.proxy
```

结果
```bash
➜  my-docs git:(main) ✗ brew update
Already up-to-date.
```

## 把mac的终端改为oh-my-zsh之后输入brew命令输出zsh: command not found: brew。

确认 Homebrew 安装：请确保已经正确安装了 Homebrew。你可以尝试在终端中运行 `brew` 命令来验证。如果没有正确安装，你可以按照 Homebrew 的官方文档进行安装步骤。

检查环境变量：Oh My Zsh 可能没有正确加载你的环境变量。你可以检查 `~/.zshrc` 文件，确保以下几行代码存在：
```bash
export PATH="/opt/homebrew/bin:$PATH"
export PATH="/opt/homebrew/sbin:$PATH"

# 修改了 ~/.zshrc 文件之后，需要刷新终端
# 也可以关闭终端窗口并重新打开
source ~/.zshrc
```

我的brew安装目录是/opt/homebrew

## mac brew 如何更换国内源或者设置mac brew 走代理？

要更换Mac Brew的国内源或者设置它走代理，你可以按照以下步骤进行操作：

1. 更换国内源：

   - 首先，打开终端（Terminal）应用程序。

   - 输入以下命令以备份原有的brew配置文件：

     ```bash
     cp ~/.bash_profile ~/.bash_profile_backup
     ```

   - 编辑.bash_profile文件：

     ```bash
     nano ~/.bash_profile
     ```

   - 在文件末尾添加以下两行命令来设置国内源（以清华大学源为例）：

     ```bash
     export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles
     export HOMEBREW_CORE_GIT_REMOTE=https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git
     ```

   - 保存并退出编辑器（按下Ctrl+X，然后按Y键确认保存，最后按Enter键退出）。

   - 更新修改后的配置：

     ```bash
     source ~/.bash_profile
     ```

2. 设置Mac Brew走代理：

   - 打开终端（Terminal）应用程序。

   - 输入以下命令来设置代理（假设你使用的是HTTP代理，且代理服务器地址为127.0.0.1，端口号为8888）：

     ```bash
     export ALL_PROXY=socks5://127.0.0.1:8888
     ```

   - 如果你使用的是其他类型的代理（如HTTPS代理或SOCKS4代理），请相应地修改命令中的"socks5"为对应的类型。

   - 如果你需要验证身份，可以在代理地址后添加用户名和密码：

     ```bash
     export ALL_PROXY=socks5://username:password@127.0.0.1:8888
     ```

   - 执行上述命令后，Mac Brew将通过代理进行网络访问。

请注意，这些设置可能因个人网络环境而有所不同。如果遇到问题，建议参考官方文档或寻求相关支持。

## 清除缓存：尝试清除Brew的缓存，然后再次运行`brew update`命令。可以使用以下命令来清除缓存：

```bash
brew cleanup
```

## 如果你正在使用Oh My Zsh，可以按照以下步骤进行操作：

1. 打开终端应用程序。

2. 输入以下命令以编辑Zsh配置文件：

   ```bash
   nano ~/.zshrc
   ```

3. 在文件末尾添加以下两行命令来设置国内源（以清华大学源为例）：

   ```bash
   export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles
   export HOMEBREW_CORE_GIT_REMOTE=https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git
   ```

4. 保存并退出编辑器（按下Ctrl+X，然后按Y键确认保存，最后按Enter键退出）。

5. 更新修改后的配置：

   ```bash
   source ~/.zshrc
   ```

这样就能够在Oh My Zsh中设置Mac Brew的国内源了。如果需要设置代理，请按照前面提到的设置Mac Brew走代理的方法，在.zshrc文件中添加相应的代理设置。

请注意，以上步骤是基于Oh My Zsh默认的配置文件路径。如果你的配置文件路径不同，可以根据实际情况进行相应的调整。

## 参考资料
- https://juejin.cn/post/6844904084776960008
- https://juejin.cn/post/6931190862295203848
- https://github.com/Homebrew/brew/issues/14516
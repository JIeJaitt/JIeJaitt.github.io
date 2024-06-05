---
title: ruby
tags:
---
```bash
➜  ~ reby -v
zsh: command not found: reby
➜  ~ ruby -v
ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin23]
➜  ~ brew install ruby
HOMEBREW_BREW_GIT_REMOTE set: using https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git as the Homebrew/brew Git remote.
remote: Enumerating objects: 420, done.
remote: Counting objects: 100% (219/219), done.
remote: Compressing objects: 100% (22/22), done.
remote: Total 420 (delta 208), reused 197 (delta 197), pack-reused 201
Receiving objects: 100% (420/420), 497.17 KiB | 2.67 MiB/s, done.
Resolving deltas: 100% (217/217), completed with 57 local objects.
From https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew
   443e4e5dac..b5a8efca83  master     -> origin/master
 * [new tag]               4.3.3      -> 4.3.3
==> Auto-updating Homebrew...
Adjust how often this is run with HOMEBREW_AUTO_UPDATE_SECS or disable with
HOMEBREW_NO_AUTO_UPDATE. Hide these hints with HOMEBREW_NO_ENV_HINTS (see `man brew`).
==> Downloading https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/bottles-portable-ruby/portable-ruby-3.3.2.arm64_big_sur.bottle.tar.gz
######################################################################### 100.0%
==> Pouring portable-ruby-3.3.2.arm64_big_sur.bottle.tar.gz
==> Auto-updated Homebrew!
Updated 4 taps (homebrew/command-not-found, homebrew/services, homebrew/core and homebrew/cask).
==> New Formulae
fern-api        oils-for-unix   pedump          span-lite       yara-x
haproxy@2.8     openfa          rustls-ffi      vexctl
==> New Casks
alcom                                    font-playwrite-nl
anchor-wallet                            font-playwrite-no
font-alumni-sans-collegiate-one-sc       font-playwrite-pl
font-anton-sc                            font-playwrite-pt
font-arsenal-sc                          font-playwrite-ro
font-baskervville-sc                     font-playwrite-sk
font-bodoni-moda-sc                      naps2
font-bona-nova-sc                        qlzipinfo
font-playwrite-is

You have 13 outdated formulae installed.

==> Fetching dependencies for ruby: libyaml
==> Fetching libyaml
==> Downloading https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/libyaml-0.
Already downloaded: /Users/jiejaitt/Library/Caches/Homebrew/downloads/0cd646675b7311b5d15e90f459ab5455bb04240a7cd6d88100e43db4db8b59f1--libyaml-0.2.5.arm64_sonoma.bottle.tar.gz
==> Fetching ruby
==> Downloading https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/ruby-3.3.2
######################################################################### 100.0%
==> Installing dependencies for ruby: libyaml
==> Installing ruby dependency: libyaml
==> Pouring libyaml-0.2.5.arm64_sonoma.bottle.tar.gz
🍺  /opt/homebrew/Cellar/libyaml/0.2.5: 11 files, 354.8KB
==> Installing ruby
==> Pouring ruby-3.3.2.arm64_sonoma.bottle.tar.gz
==> Caveats
By default, binaries installed by gem will be placed into:
  /opt/homebrew/lib/ruby/gems/3.3.0/bin

You may want to add this to your PATH.

ruby is keg-only, which means it was not symlinked into /opt/homebrew,
because macOS already provides this software and installing another version in
parallel can cause all kinds of trouble.

If you need to have ruby first in your PATH, run:
  echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc

For compilers to find ruby you may need to set:
  export LDFLAGS="-L/opt/homebrew/opt/ruby/lib"
  export CPPFLAGS="-I/opt/homebrew/opt/ruby/include"

For pkg-config to find ruby you may need to set:
  export PKG_CONFIG_PATH="/opt/homebrew/opt/ruby/lib/pkgconfig"
==> Summary
🍺  /opt/homebrew/Cellar/ruby/3.3.2: 19,792 files, 51.5MB
==> Running `brew cleanup ruby`...
Disable this behaviour by setting HOMEBREW_NO_INSTALL_CLEANUP.
Hide these hints with HOMEBREW_NO_ENV_HINTS (see `man brew`).
==> Caveats
==> ruby
By default, binaries installed by gem will be placed into:
  /opt/homebrew/lib/ruby/gems/3.3.0/bin

You may want to add this to your PATH.

ruby is keg-only, which means it was not symlinked into /opt/homebrew,
because macOS already provides this software and installing another version in
parallel can cause all kinds of trouble.

If you need to have ruby first in your PATH, run:
  echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc

For compilers to find ruby you may need to set:
  export LDFLAGS="-L/opt/homebrew/opt/ruby/lib"
  export CPPFLAGS="-I/opt/homebrew/opt/ruby/include"

For pkg-config to find ruby you may need to set:
  export PKG_CONFIG_PATH="/opt/homebrew/opt/ruby/lib/pkgconfig"
➜  ~ echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
➜  ~ ruby -v                                                          
ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin23]
```
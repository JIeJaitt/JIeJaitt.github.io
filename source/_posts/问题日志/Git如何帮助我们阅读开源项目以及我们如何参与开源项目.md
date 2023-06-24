---
title: Git如何帮助我们阅读开源项目以及我们如何参与开源项目
categories: 问题日志
toc: true
abbrlink: c2b934a
date: 2023-06-24 20:37:05
tags:
sticky:
---

# Git如何帮助我们阅读开源项目以及我们如何参与开源项目

## 阅读开源代码小技巧——Git历史记录快速翻页式签出

通过阅读源码来学习开源项目是最直接也最有效的方法。而想要了解一个开源项目，最好是从第一个 commit 开始看起，特别是第一个最小可用版本发布前的 commits, 通过阅读对每一次 commit 提交源码，能够最直接的理解作者的设计思路和开发过程中的思考。

在 GitHub 的 repository 页面上可以很方便的看到所有历史记录及其演进。不过，使用 IDE 或有跳转功能的编辑器来阅读会更方便。这就需要我们将代码仓 Clone 到本地。

Clone 下来的开源 Git 仓，想要签出第一次 commit 也简单：通过 `git log --reverse` 倒序展示 log,排在第一个的即是第一次 commit, 拷贝 commit sha 值，然后 `git checkout commit_sha` 便可以签出该commit的代码。

当我们想继续跟着作者的节奏看接来下开发的内容，便需要再次 show log, 并找出下一次的 commit sha 值，如果 commit 记录很多，找起来就不那么容易了。因此我在看 git 代码历史的时候想，能不能将 git commits 历史记录当成像网站页面一样可以分页查看呢，通过简单的上翻下翻命令来 checkout 到各 commit 节点的代码。

其实也不难，无非是用管道将上面提到的命令串起来，写成 shell 可执行文件放到 git 安装的 bin 目录即可。签出第一次 Commit 节点代码的 shell 脚本如下：（通过 `git log --reverse --pretty=%H` 可以将 log 记录倒序并只显示sha值，然后通过 args 获取管道输出 checkout.）

```shell
#!/bin/sh

first() {
	branch=refs/heads/master
	git log --reverse --pretty=%H $branch | head -1 | xargs git checkout 
}
first
```

将它存为 `git-first` 可执行文件，放到 git 安装的 bin 目录（Linux、Mac 或 Windows 皆可）。在 git 仓中执行 `git first` 即可 checkout 出第一次 commit 节点的代码。
> Windows 的 Git 一般安装在 C:\Program Files\Git 下，bin 目录非根目录下的 bin, 而是在 usr/bin 下，直接将 git-first 等文件拷贝至该目录即可。（注意：该目录原来有 git-flow 等文件。）



签出当前 commit 记录的下一个节点代码要稍微复杂些，不过也就是多了些命令的组合, stackoverflow 搜一下就能找到。通过 `git rev-parse HEAD` 可获取当前工作区代码的 commit sha 值，然后用 `grep -A` 找出倒序 log 后当前 commit sha 值的后一条记录，得到 sha 值后进行 Checkout 操作。`git-next` 的脚本如下：
```shell
# git-next

next() {
	branch=refs/heads/master
	git log --reverse --pretty=%H $branch | grep -A 1 $(git rev-parse HEAD) | tail -1 | xargs git checkout
}
next
```

> 通过阅读源码来学习开源项目是最直接也最有效的方法。

同样的，签出最后一条记录 (`git-last`) 和上一条记录 (`git-prev`) 也可以通过命令组合来实现。我还增加可选参数，可以一次上翻 / 下翻 n 条 commit. 四个脚本的源码放在了 [GitHub](https://github.com/hutusi/git-paging) 上。

在查看 git 仓库源码时便可以通过 `git next`, `git prev` 来轻松逐个 commit 进行 checkout 了。也可以通过 `git next 5` 来签出当前 commit 依次往后第 5 条 commit 的代码。 通过`git first`, `git last` 来签出第一条 commit 及最后一条节点的代码。

于是，拿到一份开源代码后，我便首先通过 `git first` 签出第一次 commit 的代码，然后通过 `git next` 逐个 commit 进行阅读。为了快速了解 commit 之间的差异，可以通过执行 `git diff HEAD^ HEAD` 来了解当前 commit 改了哪些内容。（嫌每次执行 diff 命令太长，可以设置 alias: `git config --global alias.df 'diff HEAD^ HEAD'`。这样，每次仅需执行 `git df` 便可以快速浏览差异了。）

在调试脚本时发现一个问题, shell 中的函数如果写上`function`在 Ubuntu 等 Linux 上反倒执行会报错。比如`first() {...}` 写成 `function first() {...}`. 执行时会报 `syntax error: "(" unexpected.` 的错误。上网查了一下，了解到在某些 Linux 发行版上 `sh` 指向 `dash`，不识别 `function` 标志符。 解决办法是要么将脚本的执行器改成 `bash` ，或直接将 `function` 去掉，这也是能兼容多种 shell 的最好方式。

最后再附一遍脚本地址，如果你觉得有用，请加 star: [Github Gist](https://gist.github.com/hutusi/e4f32e2bcd8d53ec86de8254ab0d5127)，提 issue 或 pr 帮助改进。



## 使用 git 阅读开源项目时的小技巧

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [blog.sigoden.com](https://blog.sigoden.com/gitbang-zhu-yue-du-kai-yuan-xiang-mu/)

> 开源项目在早期版本时代码量少，结构简练，且创意和思想已经足够成熟，是切入开源项目的好时机，我们可以使用 git 回溯项目早期代码，并在各个提交间畅游。

为什么要阅读开源项目
----------

*   源码是唯一的真实
*   加深对项目的理解
*   学习自己没有的知识
*   学习他人的写法，有助于自己代码质量的提高

[](#%E5%BC%80%E6%BA%90%E9%A1%B9%E7%9B%AE%E9%9A%BE%E7%82%B9)开源项目难点
-----------------------------------------------------------------

*   不知道从哪儿开始
*   文件太多，无法屡清楚结构
*   代码太多，测试编译时耗费太多时间
*   内容太多，难以全面理解

[](#%E5%BC%80%E6%BA%90%E9%A1%B9%E7%9B%AE%E7%89%B9%E7%82%B9)开源项目特点
-----------------------------------------------------------------

开源项目最早只是一个 idea, 这个 idea 是这个项目的根，随着项目的发展，特性会越来越多，架构可能会调整，但这个 idea 总是不变的，它是整个项目的精华。 而我们如果想要理解一个开源项目，弄懂这个 idea 是必须的，很多时候我们就是为了深入理解这个 idea 才产生阅读源码的动机。

随者这个 idea 的实现，这个项目算是诞生了。但随着越来越多特性的加入，越来越多代码的提交，这个 idea 越来越深的掩藏起来。所以我们可以从**早期版本**入手。

最早完成 idea 的版本中这个 idea 是最清晰的，代码量是最少的，也是我们理解这个项目的最佳时机。

[](#%E4%BD%BF%E7%94%A8-git-%E5%B8%AE%E5%8A%A9%E7%90%86%E8%A7%A3%E5%BC%80%E6%BA%90%E9%A1%B9%E7%9B%AE)使用 git 帮助理解开源项目
-------------------------------------------------------------------------------------------------------------------

早期版本是切入开源项目的好时机，git 是版本控制领域的佼佼者，使用 git 帮助理解开源项目

### [](#%E9%80%86%E5%BA%8F%E6%9F%A5%E7%9C%8B%E6%97%A5%E5%BF%97)逆序查看日志

```
git log --reverse
```

### [](#%E6%89%BE%E4%B8%80%E4%B8%AA%E6%84%9F%E5%85%B4%E8%B6%A3%E7%9A%84%E7%89%88%E6%9C%AC%E5%88%87%E5%85%A5)找一个感兴趣的版本切入

```
git checkout <commit-id>
```

### [](#%E5%AF%BC%E8%88%AA%E4%B8%8E%E5%AF%B9%E6%AF%94)导航与对比

*   切换当前提交的上一次提交

```
git checkout HEAD~
```

*   切换当前提交的下一次提交

```
git log --reverse --pretty=%H master | grep -A 1 $(git rev-parse HEAD) | tail -n1 | xargs git checkout;
```

*   比较上一个分支与当前分支

```
git diff HEAD~..HEAD
```

### [](#%E8%BF%BD%E8%B8%AA%E6%96%87%E4%BB%B6%E7%9A%84%E5%8F%98%E6%9B%B4%E5%8E%86%E5%8F%B2)追踪文件的变更历史

```
git log --follow path/to/source_file
```

根据需要，可以专门阅读该文件相关的某个特定的 commit，很多时候项目第一版的代码会比最新版的代码简单很多，阅读旧版的代码可能会比较容易。如果是为了修复 bug 而读代码，这样的变更历史有时候可以提示我们哪个 commit 可能引入了 bug。

### [](#%E6%9F%A5%E6%89%BE%E5%AD%97%E6%AE%B5)查找字段

```
git grep -w func -A100 -B100
```

假设有一个内部函数叫做`func()`, 没有文档，如何知道这个函数怎么用？除了阅读内部函数的实现和阅读实例，基本上没有其他方法。对于这种情况 可以批量找到 func 的用例，在 vim 里从上往下先扫一遍，找到尽可能简单的用例，然后再返回到源文件中阅读这个用例的上下文。

### [](#%E5%88%AB%E5%90%8D)别名

有些常用的 git 操作，我们可以通过设置 git alias 加快输入

```
git config --global alias.prev 'checkout HEAD~'
git config --global alias.next '! f() { git log --reverse --pretty=%H ${1:-master} | grep -A 1 $(git rev-parse HEAD) | tail -n1 | xargs git checkout; }; f'
git config --global alias.difp 'diff HEAD~..HEAD'
```


## 

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [blog.csdn.net](https://blog.csdn.net/qq_40741855/article/details/105274984)

> 思路：由简单到复杂。

思路：

由简单到复杂。

从最初的 [commit](https://so.csdn.net/so/search?q=commit&spm=1001.2101.3001.7020)，到最近的一次 commit，项目经历了一个从无到有，从小到大的过程。

我们可以从最初的提交开始，阅读源码。

第一步：获取所有的 commit

通过命令：

```
git log
```

可以查看所有的 commit 记录，但是在 shell 中看，不是很方便。

如何把上述命令的结果写入到一个文件呢？通过下述命令：

```
git log > commitrecords.txt
```

第二步：从首次 commit 开始，获取每次 commit 后的代码，并排除其后的代码的干扰

如何实现呢？通过下面的命令能做到去到任何的 commit：

```
git checkout d04afd4f593dc63ad366803cf9aef4e43d372298 #指定的commit
```

那，git 给了我们类似于时光倒流的能力。现在我们可以从最简单的 initial commit 开始阅读代码了。



## 如何参与开源项目
> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [zhuanlan.zhihu.com](https://zhuanlan.zhihu.com/p/538667999)

本文作者：Daniel Hu  
个人主页：[https://www.danielhu.cn/](https://www.danielhu.cn/)

一、概述
----

**今天我准备和你详细介绍如何开始参与开源项目，帮助你在 GitHub 上完成第一个 PR 的合入**。

当然，除了正常的 PR 合入流程之外，我还准备详细介绍一下如果一个 PR 提交后遇到了冲突、需要追加 commits、需要合并 commits 等等相对复杂问题该如何解决。

总的来说，本文计划分为 4 个部分：

1.  谈谈为什么要参与开源项目以及我为什么要介绍如何 PR
2.  谈谈怎么开始参与开源项目，也就是如何寻找合适的开源项目、如何寻找贡献点
3.  介绍怎么上手 PR 流程，即从 fork 到 push 全流程
4.  介绍提交了 PR 之后遇到各种常见问题如何解决

Ok, let's get started!

二、为什么要参与开源项目
------------

本文我不打算长篇大论 “为什么要参与开源”，详细介绍参与开源项目的收获，我想仅从“提升编码能力” 角度谈一谈“为什么要参与开源项目”。

在面试的时候我有个习惯，如果候选人在自己的简历里说到自己熟悉某一门语言，我就会习惯性问他一个问题：

**你有没有阅读过某个开源项目的源码？或者更进一步，有没有参与过某个开源社区，或者说给开源项目提过 PR**？

如果答案是肯定的，比如候选人说自己读过部分 Kubernetes 模块的源码，再进一步我确认他真的读过并且读懂了或者说真的提交过 bugfix/feature 类型的 PR，那我就不再问编程语言层面的问题了，因为我相信能看懂一个成熟的开源项目部分模块源码或者能够提交 bugfix/feature 类型的 PR 已经说明了一切。

我自己在学习 Golang 的时候，大致分为两个阶段：

1.  学习基础语法，开始写项目，直到能够熟练完成各种业务功能的开发；
2.  看了一些开源项目的源码，深感受益颇多，编码水平再上一个台阶。

差不多也就是在看 Kubernetes 项目源码的时候，我深刻认识到一般的企业内部项目和汇集全世界最优秀的程序员智慧结晶的开源项目之间的巨大差距，也意识到学习优秀开源项目源码对于一个程序员编码水平提升的重要性（当然，你可以说 Google 内部也存在非开源的非常优秀的代码，这毫无疑问，但是我想今天我们没有必要讨论特例）。

认真阅读开源项目源码，你总会发现一些小瑕疵，这时候提一个 PR(Pull Request)，让你的代码合入开源项目，运行在 “世界每一个角落”，那是多么有趣的事情！而成功合入第一个 PR 往往就像打开潘多拉魔盒一样，你会进入到另外一个世界，开始接触到开源社区，感受开源的魅力！

三、为什么我想介绍如何 PR
--------------

我司开源了 2 个项目，分别是：

1.  [CNCF Project DevStream](https://github.com/devstream-io/devstream)

![](https://pic1.zhimg.com/v2-8226beed7321c8e401e6e5d19e994460_r.jpg)

1.  [Apache DevLake](https://github.com/apache/incubator-devlake)

![](https://pic1.zhimg.com/v2-aed32869fd9ccac1f2dc43d64c4f6424_r.jpg)

DevStream 项目和 DevLake 项目隔三差五就会有新贡献者提交 PR 过来，但是多数贡献者在提交第一个 PR 时往往会遇到一个或多个问题，比如产生冲突、commits 记录过多或者混乱、commit 没有签名、commit message 不规范、各种 ci 流程检查报错等等。

在看到新贡献者提交 PR 时，我们自然是非常开心且热情地对他表示欢迎并且告知如何修复各种问题，但是随着贡献者的增多，我们的开源社区几乎每天都需要回答一个问题：“**如何正确地提交一个 PR**”。可能此时你会开始怀疑我们是不是没有提供相应的文档？其实不然，我们有详细的文档，但是人总是有惰性的，多数的新贡献者并没有足够的意愿去仔细看翻看文档然后再提交 PR，甚至很多新贡献者由于刚开始接触开源项目，对于项目结构和文档组织结构比较陌生，甚至不会想到有这些文档的存在，总之各种各样的理由让多数的新贡献者会选择 “**先提了 PR 再说**”。

那么今天我想尝试彻底讲明白 “如何正确地提交一个 PR”，尝试细说 GitHub 上的 PR 全过程，以及这里面可能会遇到的各种困难和解决办法。**一方面希望对第一次参与开源项目的新人有所帮助，另一方面希望能够进一步降低 DevStream 社区和 DevLake 社区的参与门槛**。

四、我想参与开源项目，怎么开始？
----------------

不管你为什么决定开始参与开源项目，不管出发点是出于学习、兴趣、成就感等等，还是为了让某个自己需要的特性合入某个开源项目，总之今天你下定决心，要给某个开源项目提交一个 PR 了，好，我们开始吧！

### 4.1、寻找一个合适的开源项目

如果你已经决定参与某个开源社区了，那么请直接跳过本小节。

如果你就只是想开始参与开源，暂时还不知道该参与哪个社区，那么我有几个小建议：

1.  **不要从特别成熟的项目开始**。比如现在去参与 Kubernetes 社区，一方面由于贡献者太多，很难抢到一个入门级的 issue 来开始第一个 PR；另外一方面也由于贡献者太多，你的声音会被淹没，社区维护者并不在意多你一个或者少你一个（当然可能没有人会承认，但是你不得不信），如果你提个 PR 都遇到了各种问题还不能自己独立解决，那么很可能你的 PR 会直接超时关闭，没有人在意你是不是有一个好的参与体验；
2.  **不要从特别小的项目开始**。这就不需要我解释了吧？很早期的开源项目可能面临着非常多的问题，比如代码不规范、协作流程不规范、重构频繁且不是 issue 驱动的，让外部参与者无所适从……
3.  **选择知名开源软件基金会的孵化项目**，这类项目一方面不是特别成熟，所以对新贡献者友好；另一方面也不会特别不成熟，不至于给人很差的参与体验，比如 **Apache 基金会、Linux 基金会、CNCF 等**。

比如可以从这些地方寻找自己感兴趣的开源项目：

*   [CNCF 沙箱项目](https://www.cncf.io/sandbox-projects/)
*   [CNCF 孵化项目 (列表包括毕业项目)](https://www.cncf.io/projects/)
*   [Apache 项目 (孵化期项目名字中带 Incubating)](https://projects.apache.org/projects.html)

当然，你也可以直接选择从 CNCF 沙箱项目 [DevStream](https://www.cncf.io/projects/devstream/) 或者 Apache 孵化项目 [Apache DevLake](https://projects.apache.org/project.html?incubator-devlake)，以此敲开开源世界的大门。

### 4.2、寻找贡献点

开源项目的参与方式很多，最典型的方式是提交一个特性开发或者 bug 修复相关的 PR，但是其实文档完善、测试用例完善、bug 反馈等等也都是非常有价值的贡献。不过本文还是从需要提 PR 的贡献点开始上手，以 DevStream 项目为例（其他项目也一样），在项目 GitHub 代码库首页都会有一个 [Issues 入口](https://github.com/devstream-io/devstream/issues)，这里会记录项目目前已知的 bug、proposal(可以理解成新需求)、计划补充的文档、亟需完善的 UT 等等，如下图：

![](https://pic1.zhimg.com/v2-04ca37e79e810f16c064e81f99c442fc_r.jpg)

在 Issues 里我们一般可以找到一个 “good first issue” 标签标记的 issues，点击这个标签可以进一步直接筛选出所有的 good first issues，这是社区专门留给新贡献者的相对简单的入门级 issues：

![](https://pic1.zhimg.com/v2-ea3887ca099cef6d3edc8c31405f9d38_r.jpg)

没错，从这里开始，浏览一下这些 good first issues，看下有没有你感兴趣的而且还没被分配的 issue，然后在下面留言，等待项目管理员分配任务后就可以开始编码了，就像这样：

![](https://pic4.zhimg.com/v2-84b1b5939b52da13ddc9163899ce7d77_r.jpg)

如图所示，如果一个 issue 还没有被认领，这时候你上去留个言，等待管理员会将这个任务分配给你，接着你就可以开始开发了。

五、我要提交 PR，怎么上手？
---------------

一般开源项目代码库根目录都会有一个 [CONTRIBUTING.md](http://contributing.md/) 或者其他类似名字的文档来介绍如何开始贡献，像这样：

![](https://pic3.zhimg.com/v2-c66865898ccdf0dcde7daf378416378a_r.jpg)

在 [DevStream 的 Contributing](https://github.com/devstream-io/devstream/blob/main/CONTRIBUTING.md) 文档里我们放了一个 [Development Workflow](https://github.com/devstream-io/devstream/blob/main/docs/development/development-workflow.md)，其实就是 PR 工作流的介绍，不过今天，我要更详细地聊聊 PR 工作流。

### 5.1、第一步：Fork 项目仓库

GitHub 上的项目都有一个 Fork 按钮，我们需要先将开源项目 fork 到自己的账号下，以 DevStream 为例：

![](https://pic1.zhimg.com/v2-69eacb22d1e6a087d5036ca2a3f770b0_r.jpg)

点一下 Fork 按钮，然后回到自己账号下，可以找到 fork 到的项目了：

![](https://pic3.zhimg.com/v2-3594cd43ec706ea97782b8857de7ace2_r.jpg)

这个项目在你自己的账号下，也就意味着你有任意修改的权限了。我们后面要做的事情，就是将代码变更提到自己 fork 出来的代码库里，然后再通过 Pull Request 的方式将 commits 合入上游项目。

### 5.2、第二步：克隆项目仓库到本地

对于任意一个开源项目，流程几乎都是一样的。我直接写了一些命令，大家可以复制粘贴直接执行。当然，命令里的一些变量还是需要根据你自己的实际需求修改，比如对于 DevStream 项目，我们可以先这样配置几个环境变量：

*   环境变量

```
export WORKING_PATH="~/gocode"
export USER="daniel-hutao"
export PROJECT="devstream"
export ORG="devstream-io"
```

同理对于 DevLake，这里的命令就变成了这样：

```
export WORKING_PATH="~/gocode"
export USER="daniel-hutao"
export PROJECT="incubator-devlake"
export ORG="apache"
```

记得 USER 改成你的 GitHub 用户名，WORKING_PATH 当然也可以灵活配置，你想把代码放到哪里，就写对应路径。

接着就是几行通用的命令来完成 clone 等操作了：

*   clone 等

```
mkdir -p ${WORKING_PATH}
cd ${WORKING_PATH}
# You can also use the url: git@github.com:${USER}/${PROJECT}.git
# if your ssh configuration is proper
git clone https://github.com/${USER}/${PROJECT}.git
cd ${PROJECT}

git remote add upstream https://github.com/${ORG}/${PROJECT}.git
# Never push to upstream locally
git remote set-url --push upstream no_push
```

如果你配置好了 ssh 方式来 clone 代码，当然，git clone 命令用的 url 可以改成`git@github.com:${USER}/${PROJECT}.git`。

完成这一步后，我们在本地看到的 remote 信息应该是这样的：

*   `git remote -v`

```
origin	git@github.com:daniel-hutao/devstream.git (fetch)
origin	git@github.com:daniel-hutao/devstream.git (push)
upstream	https://github.com/devstream-io/devstream (fetch)
upstream	no_push (push)
```

记住啰，你本地的代码变更永远只提交到 origin，然后通过 origin 提交 Pull Request 到 upstream。

### 5.3、第三步：更新本地分支代码

如果你刚刚完成 fork 和 clone 操作，那么你本地的代码肯定是新的。但是 “刚刚” 只存在一次，接着每一次准备开始写代码之前，你都需要确认本地分支的代码是新的，因为基于老代码开发你会陷入无限的冲突困境之中。

*   更新本地 main 分支代码：

```
git fetch upstream
git checkout main
git rebase upstream/main
```

当然，我不建议你直接在 main 分支写代码，虽然你的第一个 PR 从 main 提交完全没有问题，但是如果你需要同时提交 2 个 PR 呢？总之鼓励新增一个 feat-xxx 或者 fix-xxx 等更可读的分支来完成开发工作。

*   创建分支

```
git checkout -b feat-xxx
```

这样，我们就得到了一个和上游 main 分支代码一样的特性分支 feat-xxx 了，接着可以开始愉快地写代码啦！

### 5.4、第四步：写代码

没啥好说的，写就是了，写！

### 5.5、第五步：Commit 和 Push

*   通用的流程：

```
git add <file>
git commit -s -m "some description here"
git push origin feat-xxx
```

当然，这里大家需要理解这几个命令和参数的含义，灵活调整。比如你也可以用`git add --all`完成 add 步骤，在 push 的时候也可以加`-f`参数，用来强制覆盖远程分支（假如已经存在，但是 commits 记录不合你意）。但是请记得`git commit`的`-s`参数一定要加哦！

如果你习惯用 IDE 来 commit，当然也没有任何问题，像这样：

![](https://pic2.zhimg.com/v2-a653c6a372aaa595ad278b0e64bb88c9_r.jpg)

这里要注意 commit message 的规范，可能每个开源项目的要求不尽相同，比如 DevStream 的[规范](https://github.com/devstream-io/devstream/blob/main/docs/development/commit-messages.md)是类似这样的格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

举几个例子：

*   `feat: some description here`
*   `docs: some description here`
*   `fix: some description here`
*   `fix(core): some description here`
*   `chore: some description here`
*   ...

commit 和 push 两个步骤可以在 IDE 里一步到位，也可以分开，我习惯分开操作，给自己多一些余地。另外，我更习惯命令行操作：

*   `git push origin feat-1`

```
Counting objects: 80, done.
Delta compression using up to 10 threads.
Compressing objects: 100% (74/74), done.
Writing objects: 100% (80/80), 13.78 KiB | 4.59 MiB/s, done.
Total 80 (delta 55), reused 0 (delta 0)
remote: Resolving deltas: 100% (55/55), completed with 31 local objects.
remote: 
remote: Create a pull request for 'feat-1' on GitHub by visiting:
remote:      https://github.com/daniel-hutao/devstream/pull/new/feat-1
remote: 
To github.com:daniel-hutao/devstream.git
 * [new branch]      feat-1 -> feat-1
```

到这里，本地 commits 就推送到远程了。

### 5.6、第六步：开一个 PR

在完成 push 操作后，我们打开 GitHub，可以看到一个黄色的提示框，告诉我们可以开一个 Pull Request 了：

![](https://pic2.zhimg.com/v2-845e20091145a3aa521c1993dbde9891_r.jpg)

如果你没有看到这个框，也可以直接切换到 feat-1 分支，然后点击下方的 “Contribute” 按钮来开启一个 PR，或者直接点 Issues 边上的 Pull requests 进入对应页面。

*   Pull Request 格式默认是这样的：

![](https://pic1.zhimg.com/v2-778f4cc0d766c06260c6556740e46768_r.jpg)

这里我们需要填写一个合适的标题（默认和 commit message 一样），然后按照模板填写 PR 描述。PR 模板其实在每个开源项目里都不太一样，我们需要仔细阅读上面的内容，避免犯低级错误。

比如 DevStream 的模板里目前分为 4 个部分：

1.  **Pre-Checklist**：这里列了 3 个前置检查项，提醒 PR 提交者要先阅读 Contributing 文档，然后代码要有完善的注释或者文档，尽可能添加测试用例等；
2.  **Description**：这里填写的是 PR 的描述信息，也就是介绍你的 PR 内容的，你可以在这里描述这个 PR 解决了什么问题等；
3.  **Related Issues**：记得吗？我们在开始写代码之前其实是需要认领 issue 的，这里要填写的也就是对应 issue 的 id，假如你领的 issue 链接是 [https://github.com/devstream-io/devstream/issues/796，并且这个](https://github.com/devstream-io/devstream/issues/796%EF%BC%8C%E5%B9%B6%E4%B8%94%E8%BF%99%E4%B8%AA) issue 通过你这个 PR 的修改后就完成了，可以关闭了，这时候可以在 Related Issues 下面写 “**close #796**”；
4.  **New Behavior**：代码修改后绝大多数情况下是需要进行测试的，这时候我们可以在这里粘贴测试结果截图，这样 reviewers 就能够知道你的代码已经通过测试，功能符合预期，这样可以减少 review 工作量，快速合入。

这个模板并不复杂，我们直接对着填写就行。

*   比如：

![](https://pic1.zhimg.com/v2-aa2b72d0de1f26f96e12334fd74cfdb8_r.jpg)

然后点击右下角 “Create pull request” 就完成了一个 PR 的创建了。不过我这里不能去点这个按钮，我用来演示的修改内容没有意义，不能合入上游代码库。不过我还是想给你看下 PR 创建出来后的效果，我们以 [pr655](https://github.com/devstream-io/devstream/pull/655) 为例吧：

![](https://pic2.zhimg.com/v2-4b5e7208d7133a28d0dc45f0f1539191_r.jpg)

这是上个月我提的一个 PR，基本和模板格式一致。除了模板的内容，可能你已经注意到这里多了一个 Test 小节，没错，模板不是死的，模板只是为了降低沟通成本，你完全可以适当调整，只要结果是 “往更清晰的方向走” 的。我这里通过 Test 部分添加了本地详细测试结果记录，告诉 reviewers 我已经在本地充分测试了，请放心合入。

提交了 PR 之后，我们就可以在 PR 列表里找到自己的 PR 了，这时候还需要注意 ci 检查是不是全部能够通过，假如失败了，需要及时修复。以 DevStream 为例，ci 检查项大致如下：

![](https://pic4.zhimg.com/v2-a4c8b396b04978564a488bfae5089813_r.jpg)

### 5.7、第七步：PR 合入

如果你的 PR 很完美，毫无争议，那么过不了太长时间，项目管理员会直接合入你的 PR，那么你这个 PR 的生命周期也就到此结束了。

但是，没错，这里有个 “但是”，但是往往第一次 PR 不会那么顺利，我们接下来就详细介绍一下可能经常遇到的一些问题和对应的解决办法。

六、我提交了一个 PR，然后遇到了问题 A,B,C,D,E,F,G,...
-------------------------------------

多数情况下，提交一个 PR 后是不会被马上合入的，reviewers 可能会提出各种修改意见，或者我们的 PR 本身存在一些规范性问题，或者 ci 检查就直接报错了，怎么解决呢？继续往下看吧。

### 6.1、Reviewers 提了一些修改意见，我如何更新 PR？

很多时候，我们提交了一个 PR 后，还需要继续追加 commit，比如提交后发现代码还有点问题，想再改改，或者 reviewers 提了一些修改意见，我们需要更新代码。

一般我们遵守一个约定：在 review 开始之前，更新代码尽量不引入新的 commits 记录，也就是能合并就合并，保证 commits 记录清晰且有意义；在 review 开始之后，针对 reviewers 的修改意见所产生的新 commit，可以不向前合并，这样能够让二次 review 工作更有针对性。

不过不同社区要求不一样，可能有的开源项目会要求一个 PR 里只能包含一个 commit，大家根据实际场景灵活判断即可。

说回如何更新 PR，我们只需要在本地继续修改代码，然后通过和第一个 commit 一样的步骤，执行这几个命令：

```
git add <file>
git commit -s -m "some description here"
git push origin feat-xxx
```

这时候别看 push 的是 origin 的 feat-xxx 分支，其实 GitHub 会帮你把新增的 commits 全部追加到一个未合入 PR 里去。没错，你只管不断 push，PR 会自动更新。

至于如何合并 commits，我们下一小节具体介绍。

### 6.2、Commits 太多或者记录混乱，如何合并 Commits？

很多情况下我们需要去合并 commits，比如你的第一个 commit 里改了 100 行代码，然后发现少改了 1 行，这时候又提交了一个 commit，那么第二个 commit 就太 “没意思” 了，我们需要合并一下。

### 6.2.1、Git 命令行方式合并 Commits

比如我这里有 2 个同名的 commits，第二个 commit 其实只改了一个标点：

![](https://pic2.zhimg.com/v2-1d7bfc256f1cbe14164a7a4db6e6ae1d_r.jpg)

这时候我们可以通过 rebase 命令来完成 2 个 commits 的合并：

```
git rebase -i HEAD~2
```

执行这个命令会进入一个编辑页面，默认是 vim 编辑模式，内容大致如下：

```
pick 3114c0f docs: just for test
pick 9b7d63b docs: just for test

# Rebase d640931..9b7d63b onto d640931 (2 commands)
#
# Commands:
# p, pick = use commit
# r, reword = use commit, but edit the commit message
# e, edit = use commit, but stop for amending
# s, squash = use commit, but meld into previous commit
# f, fixup = like "squash", but discard this commit's log message
# x, exec = run command (the rest of the line) using shell
# d, drop = remove commit
#
# These lines can be re-ordered; they are executed from top to bottom.
#
# If you remove a line here THAT COMMIT WILL BE LOST.
#
# However, if you remove everything, the rebase will be aborted.
```

我们需要把第二个 pick 改成 s，然后保存退出 (vim 的 wq 命令)：

```
pick 3114c0f docs: just for test
s 9b7d63b docs: just for test
```

接着会进入第二个编辑页面：

```
# This is a combination of 2 commits.
# This is the 1st commit message:

docs: just for test

Signed-off-by: Daniel Hu <tao.hu@merico.dev>

# This is the commit message #2:

docs: just for test

Signed-off-by: Daniel Hu <tao.hu@merico.dev>

# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
# ...
```

这里是用来编辑合并后的 commit message 的，我们直接删掉多余部分，只保留这样几行：

```
docs: just for test

Signed-off-by: Daniel Hu <tao.hu@merico.dev>
```

接着同样是 vim 的保存退出操作，这时候可以看到日志：

```
[detached HEAD 80f5e57] docs: just for test
 Date: Wed Jul 6 10:28:37 2022 +0800
 1 file changed, 2 insertions(+)
Successfully rebased and updated refs/heads/feat-1.
```

这时候可以通过`git log`命令查看下 commits 记录是不是符合预期：

![](https://pic3.zhimg.com/v2-fe5dabaf66f1c81efc4e2e340e350916_r.jpg)

好，我们在本地确认 commits 已经完成合并，这时候就可以继续推送到远程，让 PR 也更新掉：

```
git push -f origin feat-xxx
```

这里需要有一个`-f`参数来强制更新，合并了 commits 本质也是一种冲突，需要冲掉远程旧的 commits 记录。

### 6.2.2 IDE 里合并 Commits

图形化方式当然也可以实现 Commits 的合并。

*   截图走起

![](https://pic2.zhimg.com/v2-c33883ee6abcc8a7224275aa52101d21_r.jpg)

1.  点击右下角的 Git
2.  选择想要合并的 commits
3.  右键，然后点击 Squash Commits，记得嘴里默念一句：走你！

接着就可以看到这个页面了：

![](https://pic1.zhimg.com/v2-1c869ebdbe7e39fe9dc4e6228696f58c_r.jpg)

这是图形化方式修改 commit message 的页面，行吧，改成你喜欢的样子，然后点击右下角的 OK 按钮，事情就算结束了。

![](https://pic1.zhimg.com/v2-2f2f528d0fd2a0df9c478c431bf834d8_r.jpg)

看，2 个 commits，它们 “融合” 了，变成了一个 “改头换面” 的新 commit 了。

### 6.3、PR 产生了冲突，如何解决？

冲突可以在线解决，也可能本地解决，我们逐个来看。

### 6.3.1、在线解决冲突

我们要尽可能避免冲突，养成每次写代码前更新本地代码的习惯。不过，冲突不可能完全避免，有时候你的 PR 被阻塞了几天，可能别人改了同一行代码，还抢先被合入了，这时候你的 PR 就出现冲突了，类似这样（同样，此刻我不能真的去上游项目构造冲突，所以下面用于演示的冲突在我在自己的 repo 里）：

![](https://pic3.zhimg.com/v2-0eaabe040dd93dfb91047d939018e8ee_r.jpg)

每次看到这个页面都会让人觉得心头一紧。我们点击 “Resolve conflicts” 按钮，就可以看到具体冲突的内容了：

![](https://pic4.zhimg.com/v2-8194c40b6c6668df294cc038759a236b_r.jpg)

可以看到具体冲突的行了，接下来要做的就是解决冲突。我们需要删掉所有的 `<<<<<<<`、`>>>>>>>` 和 `=======` 标记，只保留最终想要的内容，如下：

![](https://pic4.zhimg.com/v2-850fd9e10c499d33dca80dcfbe042003_r.jpg)

接着点击右上角的 “Mark as Resolved”：

![](https://pic1.zhimg.com/v2-e7a97d9b728c91d3fc08bc1c0ac98a3c_r.jpg)

最后点击 “Commit merge”：

![](https://pic2.zhimg.com/v2-88a39095987f802ce42d1d2a453382e9_r.jpg)

这样就完成冲突解决了，可以看到产生了一个新的 commit：

![](https://pic1.zhimg.com/v2-e48f4ab94db866bce8d120b03a718dbc_r.jpg)

到这里，冲突就解决掉了。

### 6.3.2、本地解决冲突

更多时候，我们需要在本地解决冲突，尤其是冲突太多，太复杂的时候。

同样，我们构造一个冲突，这次尝试在本地解决冲突。

*   先在线看一下冲突的内容：

![](https://pic2.zhimg.com/v2-76944e888cd1715b358c879f25ec8c11_r.jpg)

*   接着我们在本地执行：

```
# 先切回到 main 分支
git checkout main
# 拉取上游代码（实际场景肯定是和上游冲突，我们这里的演示环境其实是 origin）
git fetch upstream
# 更新本地 main（这里也可以用 rebase，但是 reset 不管有没有冲突总是会成功）
git reset --hard upstream/main
```

到这里，本地 main 分支就和远程 (或者上游) main 分支代码完全一致了，然后我们要做的是将 main 分支的代码合入自己的特性分支，同时解决冲突。

```
git checkout feat-1
git rebase main
```

*   这时候会看到这样的日志：

```
First, rewinding head to replay your work on top of it...
Applying: docs: conflict test 1
Using index info to reconstruct a base tree...
M       README.md
Falling back to patching base and 3-way merge...
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
error: Failed to merge in the changes.
Patch failed at 0001 docs: conflict test 1
The copy of the patch that failed is found in: .git/rebase-apply/patch

Resolve all conflicts manually, mark them as resolved with
"git add/rm <conflicted_files>", then run "git rebase --continue".
You can instead skip this commit: run "git rebase --skip".
To abort and get back to the state before "git rebase", run "git rebase --abort".
```

我们需要解决冲突，直接打开 [README.md](http://readme.md/)，找到冲突的地方，直接修改。这里的改法和上一小节介绍的在线解决冲突没有任何区别，我就不赘述了。

代码里同样只保留最终内容，然后继续 git 命令走起来：

![](https://pic1.zhimg.com/v2-e23c7ac29013bed82428c326948bf574_r.jpg)

可能此时你并不放心，那就通过`git log`命令看一下 commits 历史记录吧：

![](https://pic1.zhimg.com/v2-b914866f01d0f13bab16767a4bcf6c80_r.jpg)

这里的 “conflict test 2” 是我提交到 main 分支的记录，可以看到这个时间比 “conflict test 1” 还要晚了一些，但是它先合入了。我们在 rebase 操作后，这个记录在前，我们特性分支的 “conflict test 1” 在后，看起来很和谐，我们继续将这个变更推送到远程，这个命令已经出现很多次了：

```
git push -f origin feat-xxx
```

这时候我们再回到 GitHub 看 PR 的话，可以发现冲突已经解决了，并且没有产生多余的 commit 记录，也就是说这个 PR 的 commit 记录非常干净，好似冲突从来没有出现过：

![](https://pic4.zhimg.com/v2-9e75f2e0b6d4fe24b90847168d163b17_r.jpg)

至于什么时候可以在线解决冲突，什么时候适合本地解决冲突，就看大家如何看待 “**需不需要保留解决冲突的记录**” 了，不同社区的理解不一样，可能特别成熟的开源社区会希望使用本地解决冲突方式，因为在线解决冲突产生的这条 merge 记录其实 “没营养”。至于 DevStream 社区和 DevLake 社区，我们推荐使用后一种，但是不做强制要求。

### 6.4、CI 检查不过：commit message 相关问题如何修复？

前面我们提到过 commit message 的规范，但是第一次提交 PR 的时候还是很容易出错，比如`feat: xxx`其实能通过 ci 检查，但是`feat: Xxx`就不行了。假设现在我们不小心提交了一个 PR，但是里面 commit 的 message 不规范，这时候怎么修改呢？

*   太简单了，直接执行：

```
git commit --amend
```

这条命令执行后就能进入编辑页面，随意更新 commit message 了。改完之后，继续 push：

```
git push -f origin feat-xxx
```

这样就能更新 PR 里的 commit message 了。

### 6.5、CI 检查不过：DCO(sign) 问题如何修复？

相当多的开源项目会要求所有合入的 commits 都包含一行类似这样的记录：

```
Daniel Hu <tao.hu@merico.dev>
```

所以 commit message 看起来会像这样：

```
feat: some description here
    
Signed-off-by: Daniel Hu <tao.hu@merico.dev>
```

这行信息相当于是对应 commit 的作者签名。要添加这样一行签名当然很简单，我们直接在`git commit`命令后面加一个`-s`参数就可以了，比如`git commit -s -m "some description here"`提交的 commit 就会带上你的签名。

但是如果如果你第一次提交的 PR 里忘记了在 commits 中添加 Signed-off-by 呢？这时候，如果对应开源项目配置了 [DCO 检查](https://wiki.linuxfoundation.org/dco)，那么你的 PR 就会在 ci 检查中被 “揪出来” 没有正确签名。

同样先构造一个没有加签名的 commit：

![](https://pic1.zhimg.com/v2-a36c3108f2dcf702cde0440703ef6c5c_r.jpg)

我不能直接推到 DevStream 项目代码库里演示如何让 DCO 报错，但是如果提 PR，看到的效果是这样的：

![](https://pic3.zhimg.com/v2-dcd03859bdf077acc9ee8ea99eecec46_r.jpg)

我们看下如何解决：

*   `git commit --amend -s`

这样一个简单的命令，就能直接在最近一个 commit 里加上 Signed-off-by 信息。执行这行命令后会直接进入 commit message 编辑页面，默认如下图：

```
docs: dco test

Signed-off-by: Daniel Hu <tao.hu@merico.dev>
```

这时候我们可以同时修改 commit message，如果不需要，那就直接保存退出好了，签名信息是会自动加上的。

完成签名后呢？当然是来一个强制 push 了：

```
git push -f origin feat-xxx
```

这样，你 PR 中的 DCO 报错就自然修复了。

最后，如何参与 DevStream 社区？
---------------------

目前 DevStream 已经加入 CNCF 成为一个沙箱项目，欢迎所有人参与社区建设，让 DevStream 越来越有生命力！

DevStream 代码仓库：[https://github.com/devstream-](https://github.com/devstream-)  
DevStream 官网：[https://www.devstream.io/](https://www.devstream.io/)  
DevStream 文档：[https://docs.devstream.io](https://docs.devstream.io/)  
如何参与贡献：[https://docs.devstream.io/en/](https://docs.devstream.io/en/)  
DevStream 社群：加入 [Slack](https://my.oschina.net/u/5701346/blog/write/cloud-native.slack.com/messages/devstream-mandarin)


## git 工作中使用总结
> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [segmentfault.com](https://segmentfault.com/a/1190000006800463?utm_source=sf-similar-article###)

> git 回滚 {代码...} git clone {代码...} git status {代码...} git add . {代码...} git commit {代码...} git push {代码......

git 回滚
------

```
git reset --hard commit_id 退到/进到，指定commit的哈希码（这次提交之前或之后的提交都会回滚）
回滚后提交可能会失败，必须强制提交
强推到远程：(可能需要解决对应分⽀的保护状态)
git push origin HEAD --force
```

git clone
---------

```
获取一个url对应的远程Git repo, 创建一个local copy.
 一般的格式是git clone [url].
```

git status
----------

```
查询repo的状态.
```

git add .
---------

```
会递归地添加当前工作目录中的所有文件
```

git commit
----------

```
提交已经被add进来的改动.
 git commit -m “the commit message"
```

git push
--------

```
git push origin master提交代码
git push origin feature/a:feature/a 把本地分支推到远程
```

git pull
--------

```
git pull origin master获取远程分支
```

git fetch
---------

```
git fetch origin develop:develop获取远程分支到本地
```

git branch
----------

```
git branch  dev 基于当前分支,创建dev分支
```

git checkout dev
----------------

```
git checkout dev 切换分支
git checkout -b devl 创建并切换分支
```

分支开发步骤, 个人总结
------------

```
1 基于主分支创建个开发分支   git checkout -b dev1
2 在开发分支中拉取下主分支   git pull origin master
2 开发完成后,提交到git服务器     git add . / git commit -m '1' / git push origin dev1
3 拉取下主分支，提前解决冲突 git pull origin master
4 切回主分支(切记要提交后切回)     git checkout master
5 拉取下最新代码  git pull origin master 
6 合并开发分支   git merge dev1(如果失败会提示失败文件,解决掉冲突)
7 提交到git服务器
```

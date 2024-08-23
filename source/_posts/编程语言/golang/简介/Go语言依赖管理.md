---
title: Go语言依赖管理
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: aad7120e
date: 2021-08-31 00:02:05
categories: 编程语言
tags: 
    - Go
sticky:
---

早期的Go语言被很多开发者所吐槽的一个问题就是没有依赖包的管理，不过随着版本的不断更迭，Go语言依赖管理方面也在不断的完善。

为什么需要了解过时的依赖管理方式？因为有的老项目可能仍然保持着老版的依赖管理方式，所以特此记录一下。

## 为什么需要依赖管理

最初的时候Go语言所依赖的所有的第三方包都放在 GOPATH 目录下面，这就导致了同一个包只能保存一个版本的代码，如果不同的项目依赖同一个第三方的包的不同版本，应该怎么解决呢？

## godep

godep 是一个Go语言官方提供的通过 vender 模式来管理第三方依赖的工具，类似的还有由社区维护的准官方包管理工具 dep。

Go语言从 1.5 版本开始开始引入 vendor 模式，如果项目目录下有 vendor 目录，那么Go语言编译器会优先使用 vendor 内的包进行编译、测试等。

#### 安装godep工具

我们可以通过`go get `命令来获取 godep 工具。

go get github.com/tools/godep

命令执行成功后会将 godep 工具的源码下载到 GOPATH 的 src 目录下对应的文件夹中，同时还会在 GOPATH 的 bin 目录下生成一个名为 godep.exe 的可执行文件，如下图所示。



![获取 godep 工具](http://c.biancheng.net/uploads/allimg/191112/4-191112093444133.gif)



为了方便使用 godep 工具，我们需要将存放 godep.exe 文件的目录添加到环境变量 PATH 中。在系统变量中找到并选中“Path”一行，点击“编辑”按钮，在新弹出的窗口中点击“新建”，然后在最下面一行中填入对应的目录信息。确认无误后点击“确定”。



![将存放 godep 工具的目录添加的环境变量中](http://c.biancheng.net/uploads/allimg/191112/4-1911121006323N.gif)


环境变量设置的打开方式我们在《[安装Go语言开发包](http://c.biancheng.net/view/3992.html)》一节中已经介绍过了，这里不再赘述。

#### godep工具的基本命令

完成上面的操作后，我们就可以在命令行窗口（CMD）中使用 godep 工具了，godep 支持的命令如下表所示：



| 命令          | 作用                                    |
| ------------- | --------------------------------------- |
| godep save    | 将依赖包的信息保存到 Godeps.json 文件中 |
| godep go      | 使用保存的依赖项运行 go 工具            |
| godep get     | 下载并安装指定的包                      |
| godep path    | 打印依赖的 GOPATH 路径                  |
| godep restore | 在 GOPATH 中拉取依赖的版本              |
| godep update  | 更新选定的包或 go 版本                  |
| godep diff    | 显示当前和以前保存的依赖项集之间的差异  |
| godep version | 查看版本信息                            |


使用`godep help [命令名称]`可以查看命令的帮助信息，如下所示。

```bash
C:\Users\Administrator>godep help go
Args: godep go [-v] [-d] command [arguments]

Go runs the go tool with a modified GOPATH giving access to
dependencies saved in Godeps.

Any go tool command can run this way, but "godep go get"
is unnecessary and has been disabled. Instead, use
"godep go install".

If -v is given, verbose output is enabled.

If -d is given, debug output is enabled (you probably don't want this, see -v).
```

#### 使用godep工具

执行`godep save `命令，会在当前目录中创建 Godeps 和 vender 两个文件夹。Godeps 文件夹下会生成一个 Godeps.json 文件，用来记录项目中所依赖的包信息；vender 目录则是用来保存当前项目所依赖的所有第三方包。



![godep save 命令执行成功后生成的两个文件夹](http://c.biancheng.net/uploads/allimg/191112/4-19111213453B61.gif)


生成的 Godeps.json 文件的结构如下所示：

```json
{
  "ImportPath": "main",
  "GoVersion": "go1.13",
  "GodepVersion": "v80",
  "Deps": [
    {
      "ImportPath": "github.com/go-gomail/gomail",
      "Comment": "2.0.0-23-g81ebce5",
      "Rev": "81ebce5c23dfd25c6c67194b37d3dd3f338c98b1"
    }
  ]
}
```



其中，“ImportPath”为项目的路径信息，“GoVersion”为Go语言的版本号，“GodepVersion”为 godep 工具的版本号，“Deps”为当前依赖包的路径、版本号信息等等。

> 提示：当引用的第三方包要升级时，只需要修改 Godep.json 里面的依赖包的版本号，然后再次执行 godep save 命令即可。

godep 工具的主要功能就是控制Go语言程序编译时依赖包搜索路径的优先级。例如查找项目的某个依赖包，首先会在项目根目录下的 vender 文件夹中查找，如果没有找到就会去 GOAPTH/src 目录下查找。

## go module

go module 是Go语言从 1.11 版本之后官方推出的版本管理工具，并且从 Go1.13 版本开始，go module 成为了Go语言默认的依赖管理工具。

#### GO111MODULE

在Go语言 1.12 版本之前，要启用 go module 工具首先要设置环境变量 GO111MODULE，不过在Go语言 1.13 及以后的版本则不再需要设置环境变量。通过 GO111MODULE 可以开启或关闭 go module 工具。

- GO111MODULE=off 禁用 go module，编译时会从 GOPATH 和 vendor 文件夹中查找包。
- GO111MODULE=on 启用 go module，编译时会忽略 GOPATH 和 vendor 文件夹，只根据 go.mod 下载依赖。
- GO111MODULE=auto（默认值），当项目在 GOPATH/src 目录之外，并且项目根目录有 go.mod 文件时，开启 go module。


Windows 下开启 GO111MODULE 的命令为：

```bash
set GO111MODULE=on 或者 set GO111MODULE=auto
```

MacOS 或者 Linux 下开启 GO111MODULE 的命令为：

```bash
export GO111MODULE=on 或者 export GO111MODULE=auto
```

在开启 GO111MODULE 之后就可以使用 go module 工具了，也就是说在以后的开发中就没有必要在 GOPATH 中创建项目了，并且还能够很好的管理项目依赖的第三方包信息。

使用 go module 的`go mod init `命令后会在当前目录下生成一个 go. mod 文件，并且在编译/运行当前目录下代码或者使用`go get `命令的时候会在当前目录下生成一个 go.sun 文件。



![使用 go mod init 命令生成的两个文件](http://c.biancheng.net/uploads/allimg/191113/4-191113092510407.gif)


go.mod 文件记录了项目所有的依赖信息，其结构大致如下：

```go
module main.go

go 1.13

require (
  github.com/astaxie/beego v1.12.0
  github.com/shiena/ansicolor v0.0.0-20151119151921-a422bbe96644 // indirect
)
```

其中，module 为 go.mod 文件所属的包，require 为项目所依赖的包及版本号，indirect 表示间接引用。

go.sum 文件则是用来记录每个依赖包的版本及哈希值，如下所示。

```go
github.com/Knetic/govaluate v3.0.0+incompatible/go.mod h1:r7JcOSlj0wfOMncg0iLm8Leh48TZaKVeNIfJntJ2wa0=
github.com/OwnLocal/goes v1.0.0/go.mod h1:8rIFjBGTue3lCU0wplczcUgt9Gxgrkkrw7etMIcn8TM=
github.com/astaxie/beego v1.12.0 h1:MRhVoeeye5N+Flul5PoVfD9CslfdoH+xqC/xvSQ5u2Y=
github.com/astaxie/beego v1.12.0/go.mod h1:fysx+LZNZKnvh4GED/xND7jWtjCR6HzydR2Hh2Im57o=
```

常用的 go mod 命令如下表所示：

| 命令            | 作用                                           |
| --------------- | ---------------------------------------------- |
| go mod download | 下载依赖包到本地（默认为 GOPATH/pkg/mod 目录） |
| go mod edit     | 编辑 go.mod 文件                               |
| go mod graph    | 打印模块依赖图                                 |
| go mod init     | 初始化当前文件夹，创建 go.mod 文件             |
| go mod tidy     | 增加缺少的包，删除无用的包                     |
| go mod vendor   | 将依赖复制到 vendor 目录下                     |
| go mod verify   | 校验依赖                                       |
| go mod why      | 解释为什么需要依赖                             |

#### GOPROXY

proxy 顾名思义就是代理服务器的意思。大家都知道，国内的网络有防火墙的存在，这导致有些Go语言的第三方包我们无法直接通过`go get `命令获取。GOPROXY 是Go语言官方提供的一种通过中间代理商来为用户提供包下载服务的方式。要使用 GOPROXY 只需要设置环境变量 GOPROXY 即可。

目前公开的代理服务器的地址有：

- goproxy.io
- goproxy.cn：（推荐）由国内的七牛云提供。


Windows 下设置 GOPROXY 的命令为：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

MacOS 或 Linux 下设置 GOPROXY 的命令为：

```bash
export GOPROXY=https://goproxy.cn
```

Go语言在 1.13 版本之后 GOPROXY 默认值为 https://proxy.golang.org ，在国内可能会存在下载慢或者无法访问的情况，所以十分建议大家将 GOPROXY 设置为国内的 goproxy.cn。

#### 使用go get命令下载指定版本的依赖包

执行`go get `命令，在下载依赖包的同时还可以指定依赖包的版本。

- 运行`go get -u`命令会将项目中的包升级到最新的次要版本或者修订版本；
- 运行`go get -u=patch`命令会将项目中的包升级到最新的修订版本；
- 运行`go get [包名]@[版本号]`命令会下载对应包的指定版本或者将对应包升级到指定的版本。

> 提示：`go get [包名]@[版本号]`命令中版本号可以是 x.y.z 的形式，例如 go get foo@v1.2.3，也可以是 git 上的分支或 tag，例如 go get foo@master，还可以是 git 提交时的哈希值，例如 go get foo@e3702bed2。
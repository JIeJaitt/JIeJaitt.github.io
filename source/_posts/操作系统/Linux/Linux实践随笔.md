---
title: Linux实践随笔
excerpt: 本博客暂不显示摘要，请大家谅解
categories: 操作系统
tags: os
toc: true
abbrlink: 87736ce2
date: 2023-06-24 20:47:57
sticky:
---

## Linux查看操作系统版本信息

使用 `/etc/os-release` 文件：输入以下命令并按下回车：

```
cat /etc/os-release
```

这个文件包含有关操作系统的信息，包括发行版名称和版本号。

## 查看apiServer的进程pid和坚听端口来确保它已经正常运行

```bash
# 检查apiServer进程是否正在运行：
# 使用pgrep命令来查找apiServer进程的PID：
pgrep -f "go run ./apiServer/apiServer.go"
# 或者使用ps命令结合grep来过滤出apiServer进程的信息：
ps aux | grep "go run ./apiServer/apiServer.go"

# 检查apiServer是否在指定的IP地址和端口上进行监听：
# 使用lsof命令来查看指定端口是否处于监听状态：
lsof -i :12345
# 或者使用netstat命令来检查指定端口是否处于监听状态：
netstat -an | grep 12345
```

确认防火墙不会阻止对指定端口的访问：在系统偏好设置中，打开“安全性与隐私”，选择“防火墙”选项卡，确保防火墙没有阻止对指定端口的访问。
---
title: 异步通信中间件rabbitmq+Golang基础用法
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: e5381a9c
date: 2023-07-04 22:09:10
categories: 项目实战
tags: rabbitmq
sticky:
---

## 为什么需要消息队列？

消息队列是一种在应用程序之间进行异步通信的解决方案，它允许应用程序在发送和接收消息之间进行解耦。以下是为什么需要消息队列的几个原因：

1. 异步通信：消息队列使应用程序可以以异步的方式进行通信，发送方可以将消息放入队列中并继续处理其他任务，而无需等待接收方立即处理。这种异步通信模式可以提高系统的性能和可伸缩性。
2. 解耦应用程序：使用消息队列可以将应用程序解耦，即发送方和接收方不需要直接知道对方的存在。发送方只需将消息发送到队列中，而无需知道它将由哪个接收方处理。这种解耦有助于简化系统的整体架构，使各个组件能够独立地进行扩展和维护。
3. 削峰填谷：消息队列可以在高峰时段缓冲消息，然后再在低峰时段处理这些消息。这种削峰填谷的能力可以平衡系统的负载，防止系统因突发访问量过高而崩溃。
4. 消息持久化：消息队列通常会将消息持久化到磁盘上，这样即使在系统故障或断电的情况下，消息也不会丢失。这对于一些对消息可靠性要求高的应用程序非常重要。
5. 通信协作：使用消息队列可以实现多个应用程序之间的松耦合协作。不同的应用程序可以通过发送和接收消息来协调工作流程，实现更高效的系统协作。

总之，消息队列是一种强大而灵活的通信方式，可以帮助应用程序实现异步通信、解耦和高效协作，提高系统的性能、可伸缩性和可靠性。

- 七米老师总结的RabbitMQ：https://www.liwenzhou.com/posts/Go/rabbitmq-1/
- rabbitmq官方教程：https://www.rabbitmq.com/tutorials/tutorial-one-go.html
- rabbitmq教程golang【google搜索结果】：https://www.google.com/search?q=rabbitmq%E6%95%99%E7%A8%8Bgolang&sxsrf=AB5stBhXBgA_KBMJbXJ0lCp3PSqY74mBdA%3A1688472767862&ei=vwykZJKdNMTVkPIP6pes6AQ&oq=rabbitmq%E6%95%99%E7%A8%8B&gs_lcp=Cgxnd3Mtd2l6LXNlcnAQARgDMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADMgoIABBHENYEELADSgQIQRgAUABYAGCkEGgBcAF4AIABAIgBAJIBAJgBAMABAcgBCg&sclient=gws-wiz-serp
- Mac m1通过Docker安装RabbitMq：https://zhuanlan.zhihu.com/p/517674770

## 查看rabbitmq版本
```bash
# 运行此命令将输出一些关于RabbitMQ实例的信息，包括版本号
# 你可以在输出中寻找RabbitMQ version字段来获取RabbitMQ的版本信息
rabbitmqctl status
```
## 如何下载rabbitmq工具
```bash
# 对于Linux或Mac系统
curl -O http://localhost:15672/cli/rabbitmqadmin

# 对于Windows系统
powershell -command "(New-Object Net.WebClient).DownloadFile('http://localhost:15672/cli/rabbitmqadmin', 'rabbitmqadmin')"

# 对于docker的rabbitmq容器

# 启动RabbitMQ容器。你可以使用以下命令来启动RabbitMQ容器
docker run -d --name rabbitmq rabbitmq:tag
# 运行以下命令来进入到RabbitMQ容器的命令行终端
docker exec -it <container_name> bash
apt-get update
apt-get install -y curl
curl http://localhost:15672/cli/rabbitmqadmin > /usr/local/bin/rabbitmqadmin
chmod +x /usr/local/bin/rabbitmqadmin
```

这将在容器中安装 `curl` 工具，并从 RabbitMQ 的 Web 界面下载 `rabbitmqadmin` 工具。然后，将 `rabbitmqadmin` 工具复制到 `/usr/local/bin` 目录，并将其设置为可执行文件。

请注意，上述命令假定您的 RabbitMQ 容器已经在运行，并且您可以使用 `docker exec` 命令进入容器。如果您的容器没有运行，请使用 `docker start` 命令启动它。

## 启动网页版RabbitMQ管理面板

在M1 Mac上安装了Docker客户端后，你可以通过在终端中输入以下命令来启动RabbitMQ容器：
```bash

```

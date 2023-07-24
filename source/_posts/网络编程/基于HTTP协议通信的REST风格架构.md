---
title: 基于HTTP协议通信的REST风格架构
toc: true
abbrlink: 7fa2c383
date: 2023-07-04 23:31:01
categories:
tags:
sticky:
---

REST是指Representational State Transfer，是一种设计风格和架构原则，用于创建网络应用程序和服务。REST是一种轻量级、灵活和可扩展的通信协议，它基于HTTP协议进行通信，通过使用统一的接口来管理资源。

<!-- more -->

以下是对REST的一些关键概念的解释：

1. 资源（Resource）：在REST中，资源是应用程序提供的可被操作的数据或服务。每个资源都有一个唯一的标识符（URI），用于访问和操作资源。
2. 统一的接口（Uniform Interface）：REST使用统一的方法来操作资源，这些方法包括HTTP协议的GET、POST、PUT和DELETE等。对于不同类型的资源，相同的操作方法可以被重复使用。
3. 状态无关性（Statelessness）：REST服务不会保存客户端的状态信息，每个请求都是独立的。这意味着REST服务可以以无状态的方式处理客户端请求，提高可伸缩性和可靠性。
4. 超媒体驱动（HATEOAS）：REST通过在资源的响应中包含链接，使客户端能够动态地发现和使用相关资源。

可以用TCP协议、消息队列等方式实现不同类型的接口，但选择使用REST和RabbitMQ是因为它们都已经在Go语言中具备成熟的库和便捷的实现方式。
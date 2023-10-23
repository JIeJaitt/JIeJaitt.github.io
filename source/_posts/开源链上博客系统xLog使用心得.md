---
title: 开源链上博客系统xLog使用心得
date: 2023-10-23T15:12:37+08:00
categories: 
tags: 
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true
sticky:
---

作者地址：https://diygod.cc/xlog

## xlog介绍

基于 [Crossbell](https://crossbell.io/) 区块链的一个应用产品。底层技术框架是[以太坊](https://zh.wikipedia.org/wiki/以太坊)（Ethereum）、[星际文件系统](https://zh.wikipedia.org/wiki/星际文件系统)（IPFS）、专为社交内容创作打造的[智能合约](https://zh.wikipedia.org/wiki/智能合约)（Smart Contract）等。

目前这个生态刚刚推出，网络上的介绍内容还不够多。你可以阅读这些文章了解它们：

- [第一个开源链上博客系统 xLog - DIYgod](https://blog.diygod.me/xlog) 介绍 xLog。
- [Here Comes crossbell.io - crossbell-blog](https://crossbell-blog.xlog.app/32168-1) 介绍基于同步数据为核心的 Web3 社交产品 Crossbell.io。

简单来说，你的信息存于区块链上（意味着安全和永久）；你的隐私受到保护；链的生态又让社交交互变得充满无尽可能。

但吹得再猛，不如实际体验。哪怕读者从没接触过 Web3，这篇文章也愿意带着你从无到有体验 xLog 的魅力，同时也作为你的 Web3 第一课。

## MetaMask注册

MetaMask 希望收集使用数据，以更好地了解我们的用户如何与 MetaMask 交互。这些数据将用于提供服务，包括根据您的使用情况改进服务。

MetaMask 将会......

- 始终允许您通过设置选择退出
- 发送匿名的点击和页面浏览事件
-  **永远不会发生** 收集我们不需要提供服务的信息（如私钥、地址、交易散列或余额）
-  **永远不会发生**收集您的完整 IP 地址*
-  **永远不会发生** 出售数据。永远不会！

* 如您在 MetaMask中 使用 Infura 作为默认的 RPC 提供商，Infura 将在您发送交易时收集您的 IP 地址和以太坊钱包地址。我们不会以允许系统将这两项数据关联起来的方式存储这些信息。如需从数据收集角度进一步了解 MetaMask 和 Infura 如何进行交互，请参阅我们的更新版 [此处](https://consensys.net/blog/news/consensys-data-retention-update/)。如需进一步了解我们的一般隐私准则，请参阅我们的 [隐私政策在此处](https://metamask.io/privacy.html)。

同意后开始注册：

- 创建密码：此密码只会在此设备上解锁您的 MetaMask 钱包。MetaMask 无法恢复此密码(498938874@qq.com)。
- 安全钱包：什么是账户私钥助记词？您的账户私钥助记词是由12个单词组成的短语，它是您的钱包和资金的“主私钥”。如何保存我的账户私钥助记词？保存到密码管理工具、安全存放在保险箱内。写下并存储在多个秘密位置。我是否应该分享我的账户私钥助记词？切勿分享您的账户私钥助记词，包括也不能与 MetaMask 分享！如果有人要求您的恢复短语，他们可能会试图欺诈您并偷窃您的钱包资金。写下您的私钥助记词，请写下这个由12个单词组成的账户私钥助记词，然后将其保存到您信任并且只有您可以访问的地方：neither earn wood clap win change lion bonus guess ramp turtle section 。之后钱包创建成功，您已经成功地保护了您的钱包。请确保您的账户私钥助记词安全和秘密——这是您的责任！记住：MetaMask 无法恢复您的账户私钥助记词。MetaMask 绝对不会索要您的账户私钥助记词。对任何人 **切勿分享您的账户私钥助记词**，否则您的资金有被盗风险
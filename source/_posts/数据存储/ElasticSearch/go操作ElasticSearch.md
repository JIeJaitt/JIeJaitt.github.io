---
title: go操作ElasticSearch
toc: true
abbrlink: 6d0ed4d8
date: 2023-08-01 00:21:43
categories:
tags:
sticky:
---

ElasticSearch介绍：Elasticsearch（ES）是一个基于Lucene构建的开源、分布式、RESTful接口的全文搜索引擎。Elasticsearch还是一个分布式文档数据库，其中每个字段均可被索引，而且每个字段的数据均可被搜索，ES能够横向扩展至数以百计的服务器存储以及处理PB级的数据。可以在极短的时间内存储、搜索和分析大量的数据。通常作为具有复杂搜索场景情况下的核心发动机。

<!-- more -->

### 1.1.2. Elasticsearch能做什么

- 当你经营一家网上商店，你可以让你的客户搜索你卖的商品。在这种情况下，你可以使用ElasticSearch来存储你的整个产品目录和库存信息，为客户提供精准搜索，可以为客户推荐相关商品。
- 当你想收集日志或者交易数据的时候，需要分析和挖掘这些数据，寻找趋势，进行统计，总结，或发现异常。在这种情况下，你可以使用Logstash或者其他工具来进行收集数据，当这引起数据存储到ElasticsSearch中。你可以搜索和汇总这些数据，找到任何你感兴趣的信息。
- 对于程序员来说，比较有名的案例是GitHub，GitHub的搜索是基于ElasticSearch构建的，在github.com`/search`页面，你可以搜索项目、用户、issue、pull request，还有代码。共有`40~50`个索引库，分别用于索引网站需要跟踪的各种数据。虽然只索引项目的主分支（master），但这个数据量依然巨大，包括20亿个索引文档，30TB的索引文件。


## 参考资料

- https://www.topgoer.com/%E6%95%B0%E6%8D%AE%E5%BA%93%E6%93%8D%E4%BD%9C/go%E6%93%8D%E4%BD%9Celasticsearch/
- M1芯片 Mac安装Docker、ElasticSearch等：https://juejin.cn/post/7112706563151757342 。值得注意的是es8版本是默认开启ssl的，这点对本地测试不是很好，如果你是docker安装的话，可以在docker的es8镜像里面下载vim然后编es8的辑配置文件关闭ssl选项。
---
title: Hexo隐藏文章
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 1c5dc392
toc: true
date: 2024-02-27 10:35:46
categories:
tags:
sticky:
---

## Hexo -48- 文章隐藏

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [www.zywvvd.com](https://www.zywvvd.com/notes/hexo/website/48-hexo-hide/hexo-hide/)

> Hexo 博客有时有着想要发布，但是不想过于公开的场景，本文记录隐藏 Hexo 博客的技术实现。

### [](#简介)简介

之前我们介绍过 [Hexo 文章加密](https://www.zywvvd.com/pages/go.html?goUrl=%2Fnotes%2Fhexo%2Fwebsite%2F45-blog-encrypt%2Fblog-encrypt%2F)，但有时对信息保护有不同的需求，比如需要某些信息可以访问，但又不公开让所有用户那么方便地访问，万一一不小心访问到了也没什么太大损失这种。

这种情况下基于知识的加密就比较合适了，也就是链接是有效的，但是不放在主页、Archive、Search 中，想要分享给别人直接发送链接别人就可以访问。

想要实现功能有几种方法：

1.  修改 `发布状态`
    
2.  `存为草稿`
    
3.  `hexo-generator-indexed` 插件
    
4.  `hexo-hide-posts` 插件
    

### [](#测试环境)测试环境

为了测试文章隐藏功能，配置环境：

1.  创建 Hexo 初始博客
2.  创建 Foo、Bar、Test 三篇文章

[![](https://uipv4.zywvvd.com:33030/HexoFiles/vvd_pc_upload/202306152055514.jpg)](https://uipv4.zywvvd.com:33030/HexoFiles/vvd_pc_upload/202306152055514.jpg)

> 后续以此为示例数据做测试。

### [](#修改发布状态)修改发布状态

可以通过修改文章发布状态参数 `published` 来控制是否渲染该文章，如果设置为 False，则压根不会渲染，只是源文件保存在项目中。

*   在文章 Markdown 文件 `Front-Matter` 部分配置 `published` 参数

```
# 设置 published 为 false，则不会在网页中渲染
published: false


OXYGENE
```

例如我们在 Foo 文章的 Front Matter 中添加上述配置：

```yaml
---
title: Foo
date: 2023-06-15 12:04:20
published: false
tags:
---
```

渲染页面后没有 Foo 这篇文章了

[![](https://uipv4.zywvvd.com:33030/HexoFiles/vvd_pc_upload/202306152103006.jpg)](https://uipv4.zywvvd.com:33030/HexoFiles/vvd_pc_upload/202306152103006.jpg)

直接访问 Foo 所在的链接也访问不到：

[![](https://uipv4.zywvvd.com:33030/HexoFiles/vvd_pc_upload/202306152105955.jpg)](https://uipv4.zywvvd.com:33030/HexoFiles/vvd_pc_upload/202306152105955.jpg)

### [](#存为草稿)存为草稿

Hexo 自带草稿功能，草稿内容也不会发布，和 published 的区别我理解是概念上的，草稿是放在草稿箱中的文章，直接不算作 posts 的内容， publish 控制的是已经不是草稿的文章，已经属于文章范畴，功能其实是类似的。

> 草稿通过 Hexo 命令控制：

创建草稿：

```bash
hexo new draft <title>
```

> 示例：
> 
> ```
> $ hexo new draft VVDdraft
> INFO  Validating config
> INFO  Created: E:\test_hexo\TestHexo\source\_drafts\VVDdraft.md
> 
> 
> ROUTEROS
> ```

`VVDdraft.md` 的内容不会在页面中展示。

> 以上两种方法并不完全实用，因为虽然隐藏了信息但是自己也看不到，插件可以解决一部分问题。

### [](#hexo-generator-indexed-插件)`hexo-generator-indexed` 插件

```
$ npm uninstall hexo-generator-index
$ npm install hexo-generator-indexed


COFFEESCRIPT
```

隐藏文章 ，在文章的 Front-matter 中增加一个 hide 参数用来隐藏

> 还是以 Foo 为例
> 
> ```YAML
> ---
> title: Foo
> date: 2023-06-15 12:04:20
> hide: true
> tags:
> ---
> ```

设置完成后，讲道理在任何地方都不应该出现 Foo 的显示信息了，但是这个效果是因主题而异的。

#### [](#landscape)landscape

*   首页隐藏
*   archives 没有隐藏

#### [](#fluid)fluid

*   首页隐藏
*   其余页面隐藏

### [](#hexo-generator-index-custom-插件)`hexo-generator-index-custom` 插件

改插件可以完成类似`hexo-generator-indexed` 的博文隐藏功能，并且同时可以支持置顶，

相当于`hexo-generator-indexed` 和 `hexo-generator-index-pin-top` 结合。

### [](#hexo-hide-posts-插件)`hexo-hide-posts` 插件

`hexo-generator-indexed` 插件隐藏时过于彻底，为了更细粒度地进行隐藏，可以使用 `hexo-hide-posts` 插件

Github：[https://github.com/prinsss/hexo-hide-posts](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fgithub.com%2Fprinsss%2Fhexo-hide-posts)

当一篇文章被设置为「隐藏」时，它不会出现在任何列表中（包括首页、存档、分类页面、标签页面、Feed、站点地图等），也不会被搜索引擎索引（前提是搜索引擎遵守 noindex 标签）。

只有知道文章链接的人才可以访问被隐藏的文章。

#### [](#安装)安装

```
$ npm install hexo-hide-posts --save


LIVESCRIPT
```

#### [](#使用)使用

在文章的 [front-matter](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fhexo.io%2Fdocs%2Ffront-matter) 中添加 `hidden: true` 即可隐藏文章。

比如我们隐藏了 `source/_posts/lorem-ipsum.md` 这篇文章：

```
---
title: 'Lorem Ipsum'
date: '2019/8/10 11:45:14'
hidden: true
---

Lorem ipsum dolor sit amet, consectetur adipiscing elit.


YAML
```

虽然首页上被隐藏了，但你仍然可以通过 `https://hexo.test/lorem-ipsum/` 链接访问它。（如果想要完全隐藏一篇文章，可以直接将其设置为[草稿](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fhexo.io%2Fzh-cn%2Fdocs%2Fwriting.html%23%25E8%258D%2589%25E7%25A8%25BF)）

你可以在命令行运行 `hexo hidden:list` 来获取当前所有的已隐藏文章列表。

插件也在 [Local Variables](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fhexo.io%2Fapi%2Flocals) 中添加了 `all_posts` 和 `hidden_posts` 变量，供自定义主题使用。

#### [](#配置)配置

在你的站点 `_config.yml` 中添加如下配置：

```
hide_posts:
  enable: true
  
  filter: hidden
  
  
  public_generators: []
  
  noindex: true


YAML
```

举个栗子：设置 `filter: secret` 之后，你就可以在 front-matter 中使用 `secret: true` 来隐藏文章了。

**注意**：不是所有插件注册的 generator 名称都与其插件名称相同。比如 [`hexo-generator-searchdb`](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fgithub.com%2Fnext-theme%2Fhexo-generator-searchdb) 插件，其注册的 generator 名称就是 `xml` 和 `json`，而非 `searchdb`。因此，在填写 `public_generators` 参数时要注意使用插件实际注册的 generator 名称（可以查阅对应插件的源码来获取准确的注册名）。

#### [](#效果)效果

改插件的效果也是不同主题不一样，在默认的 landscape 功能正常，在 fluid 则隐藏无效。

### [](#我的最佳实践)我的最佳实践

我的需求是，在博客发布一些私人的博文，不想完全公开，但是别人看到了也没大事。同时有相关知识的人可以方便地查看相关文章，不知道内情的人很难察觉有这些文章。

其实 `hexo-hide-posts` 功能很棒，但是可惜在 fluid 主题中隐藏内容失效，但是 `hexo-generator-indexed` 的隐藏功能是好的，因此我同时开启二者，达到隐藏博文的同时，将其在一个小角落展示出来的效果。

### [](#参考资料)参考资料

*   [https://blog.ccknbc.cc/posts/how-to-hide-hexo-articles-gracefully/](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fblog.ccknbc.cc%2Fposts%2Fhow-to-hide-hexo-articles-gracefully%2F)
*   [https://blog.garryde.com/archives/37712.html](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fblog.garryde.com%2Farchives%2F37712.html)
*   [https://github.com/prinsss/hexo-hide-posts](https://www.zywvvd.com/pages/go.html?goUrl=https%3A%2F%2Fgithub.com%2Fprinsss%2Fhexo-hide-posts)

> 文章链接：  
> [https://www.zywvvd.com/notes/hexo/website/48-hexo-hide/hexo-hide/](https://www.zywvvd.com/notes/hexo/website/48-hexo-hide/hexo-hide/)



## Hexo中隐藏指定文章，并使它们仅通过只有知道链接的才可以访问隐藏文章

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [www.yeooe.cn](https://www.yeooe.cn/post/3180c6a1.html)

> 前面用 heo 方案隐藏文章试了下，如洪哥所言会首页隐藏了，但任然会计数，首页隐藏位置会一片空白。

前面用 heo 方案隐藏文章试了下，如洪哥所言会首页隐藏了，但任然会计数，首页隐藏位置会一片空白。这样的话比较影响页面内容的展示和美观，所以最后还是换插件了。

我的需求并不高，只要首页不显示隐藏的文章，并且不影响布局就可以。我用的插件是 hexo-hide-posts，可以在博客中隐藏指定文章，并只能通过文章的链接来访问，也可以让所有隐藏的文章在特定页面可见。

当一篇文章设置为隐藏时，不会出现在任何列表中（包括首页、存档、分类页面、标签页面、Feed、站点地图等），也不会被搜索引擎索引（前提是搜索引擎遵守 noindex 标签）。

[

引用站外地址，不保证站点的可用性和安全性

](https://github.com/prinsss/hexo-hide-posts/blob/master/README_ZH.md)

[](#安装 "安装")安装
--------------

```
$ npm install hexo-hide-posts --save
```

[](#使用 "使用")使用
--------------

在文章的 [front-matter](https://hexo.io/docs/front-matter) 中添加 `hidden: true` 即可隐藏文章。比如隐藏了`source/_posts/lorem-ipsum.md` 这篇文章：

```
---
title: 'Lorem Ipsum'
date: '2019/8/10 11:45:14'
hidden: true
---
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
```

完成设置后即可发现首页和其他分类上文章都被隐藏了，但可以通过`https://hexo.test/lorem-ipsum/` 链接访问它。（如果想要完全隐藏一篇文章，可以直接将其设置为[草稿](https://hexo.io/zh-cn/docs/writing.html#%E8%8D%89%E7%A8%BF)）

可以在命令行运行 `hexo hidden:list` 来获取当前所有的已隐藏文章列表。插件也在 [Local Variables](https://hexo.io/api/locals) 中添加了 `all_posts` 和 `hidden_posts` 变量，供自定义主题使用。

[](#配置 "配置")配置
--------------

在站点 `_config.yml` 中添加如下配置：

```
# hexo-hide-posts
hide_posts:
  enable: true
  # 可以改成其他你喜欢的名字
  filter: hidden
  # 指定你想要传递隐藏文章的 generator，比如让所有隐藏文章在存档页面可见
  # 常见的 generators 有：index, tag, category, archive, sitemap, feed, etc.
  public_generators: []
  # 为隐藏的文章添加 noindex meta 标签，阻止搜索引擎收录
  noindex: true
```

比如：设置 `filter: secret` 之后，你就可以在 front-matter 中使用 `secret: true` 来隐藏文章了。

**注意**：不是所有插件注册的 generator 名称都与其插件名称相同。比如 [hexo-generator-searchdb](https://github.com/next-theme/hexo-generator-searchdb) 插件，其注册的 generator 名称就是 `xml` 和 `json`，而非 `searchdb`。因此，在填写 `public_generators` 参数时要注意使用插件实际注册的 generator 名称（可以查阅对应插件的源码来获取准确的注册名）。

[![](https://www.yeooe.cn/img/iocnGif.gif)](https://www.yeooe.cn/about/)

叶椰子

分享生活与实用经验

本博客所有文章除特别声明外，均采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议。转载请注明来自 [椰罗森海](https://www.yeooe.cn/)！


## 如何优雅隐藏 Hexo 文章

https://blog.ccknbc.cc/posts/how-to-hide-hexo-articles-gracefully/

## Hexo 如何隐藏文章

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [www.cnblogs.com](https://www.cnblogs.com/yangstar/articles/16690342.html)

本 Hexo 插件可以在博客中隐藏指定的文章，并使它们仅可通过链接访问。

当一篇文章被设置为「隐藏」时，它不会出现在任何列表中（包括首页、存档、分类页面、标签页面、Feed、站点地图等），也不会被搜索引擎索引（前提是搜索引擎遵守 noindex 标签）。

只有知道文章链接的人才可以访问被隐藏的文章。

Github 地址：[https://github.com/printempw/hexo-hide-posts](https://github.com/printempw/hexo-hide-posts)

### 安装

在站点根目录下执行`npm install hexo-hide-posts --save`

### 配置

在站点目录下的`_config.yml`中如下配置：

```
# hexo-hide-posts
hide_posts:
  # 可以改成其他你喜欢的名字
  filter: hidden
  # 指定你想要传递隐藏文章的位置，比如让所有隐藏文章在存档页面可见
  # 常见的位置有：index, tag, category, archive, sitemap, feed, etc.
  # 留空则默认全部隐藏
  public_generators: []
  # 为隐藏的文章添加 noindex meta 标签，阻止搜索引擎收录
  noindex: true
```

举个栗子：设置 `filter: secret` 之后，你就可以在 front-matter 中使用 `secret: true` 来隐藏文章了。

### 使用

在文章的属性中定义 `hidden: true` 即可隐藏文章。

```
---
title: 'Hidden Post'
date: '2021/03/05 21:45:14'
hidden: true
---
```

虽然首页上被隐藏了，但你仍然可以通过 `https://hexo.test/lorem-ipsum/` 链接访问它。

你可以在命令行运行 `hexo hidden:list` 来获取当前所有的已隐藏文章列表。

插件也在 [Local Variables](https://hexo.io/api/locals) 中添加了 `all_posts` 和 `hidden_posts` 变量，供自定义主题使用。

转载:[https://blog.garryde.com/archives/37712.html](https://blog.garryde.com/archives/37712.html)

 
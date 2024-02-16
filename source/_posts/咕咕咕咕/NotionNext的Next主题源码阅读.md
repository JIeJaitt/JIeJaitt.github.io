---
title: NotionNext的Next主题源码阅读
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 77d2c149
toc: true
date: 2024-02-16 08:39:43
categories: 咕咕咕咕
tags: react
sticky:
---

## 公告：Announcement.js

```javascript
// themes/next/components/Announcement.js
import { useGlobal } from '@/lib/global'
import dynamic from 'next/dynamic'

const NotionPage = dynamic(() => import('@/components/NotionPage'))

const Announcement = ({ post, className }) => {
  const { locale } = useGlobal()
  if (!post) {
    return <></>
  }
  return <>
        <div className="text-sm pb-1 px-2 flex flex-nowrap justify-between">
            <div className="font-light text-gray-600  dark:text-gray-200">
                <i className="mr-2 fas fa-bullhorn" />{locale.COMMON.ANNOUNCEMENT}
            </div>
        </div>
        {post && (<div id="announcement-content">
            <NotionPage post={post} className='text-center ' />
        </div>)}
    </>
}
export default Announcement
```

这段代码是一个名为 `Announcement` 的 React 组件，它用于显示公告。这个组件接收两个属性：[`post`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22post%22%5D "themes/next/components/Announcement.js") 和 [`className`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22className%22%5D "themes/next/components/Announcement.js")。

首先，我们从 `@/lib/global` 导入了一个名为 `useGlobal` 的 React Hook。这个 Hook 可能用于获取全局状态，例如当前的语言环境。

然后，我们使用 `next/dynamic` 动态地导入了一个名为 [`NotionPage`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22NotionPage%22%5D "themes/next/components/Announcement.js") 的组件。动态导入是 Next.js 的一个特性，它允许你在需要的时候才加载组件，这可以提高应用的性能。

在 [`Announcement`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22Announcement%22%5D "themes/next/components/Announcement.js") 组件中，我们首先使用 `useGlobal` Hook 获取了当前的语言环境。然后，如果 [`post`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22post%22%5D "themes/next/components/Announcement.js") 属性不存在（可能是 `null` 或 `undefined`），组件将返回一个空的 React 元素（`<></>`）。

如果 [`post`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22post%22%5D "themes/next/components/Announcement.js") 属性存在，组件将返回一个包含公告信息的 JSX 元素。这个元素包含一个带有公告图标和公告文本的 `div`，以及一个 [`NotionPage`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22NotionPage%22%5D "themes/next/components/Announcement.js") 组件，它可能用于显示公告的内容。

最后，我们导出了 [`Announcement`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FAnnouncement.js%22%2C%22Announcement%22%5D "themes/next/components/Announcement.js") 组件，使其可以在其他文件中被导入和使用。

## 文章的版权信息：ArticleCopyright


```javascript
import { useGlobal } from '@/lib/global'
import Link from 'next/link'
import CONFIG from '../config'
import { siteConfig } from '@/lib/config'

export default function ArticleCopyright ({ author, url }) {
  const { locale } = useGlobal()
  if (!siteConfig('NEXT_ARTICLE_COPYRIGHT', null, CONFIG)) {
    return <></>
  }
  return (
    <section className="dark:text-gray-300 mt-6">
      <ul className="overflow-x-auto whitespace-nowrap text-sm dark:bg-gray-700 bg-gray-100 p-5 leading-8 border-l-2 border-blue-500">
        <li>
          <strong className='mr-2'>{locale.COMMON.AUTHOR}:</strong>
          <Link href={'/about'} className="hover:underline">
            {author}
          </Link>
        </li>
        <li>
        <strong className='mr-2'>{locale.COMMON.URL}:</strong>
          <a className="hover:underline" href={url}>
            {url}
          </a>
        </li>
        <li>
          <strong className='mr-2'>{locale.COMMON.COPYRIGHT}:</strong>
          {locale.COMMON.COPYRIGHT_NOTICE}
        </li>
      </ul>
    </section>
  )
}
```

这段代码定义了一个名为 [`ArticleCopyright`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FArticleCopyright.js%22%2C%22ArticleCopyright%22%5D "themes/next/components/ArticleCopyright.js") 的 React 组件，它用于显示文章的版权信息。这个组件接收两个属性：`author` 和 `url`。

首先，我们从 `@/lib/global` 导入了一个名为 `useGlobal` 的 React Hook。这个 Hook 可能用于获取全局状态，例如当前的语言环境。

然后，我们从 `next/link` 导入了 `Link` 组件，它用于创建 Next.js 应用中的链接。我们还从 `../config` 和 `@/lib/config` 导入了 `CONFIG` 和 `siteConfig`。

在 [`ArticleCopyright`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FArticleCopyright.js%22%2C%22ArticleCopyright%22%5D "themes/next/components/ArticleCopyright.js") 组件中，我们首先使用 `useGlobal` Hook 获取了当前的语言环境。然后，我们调用 `siteConfig` 函数检查是否启用了文章版权功能。如果没有启用，组件将返回一个空的 React 元素（`<></>`）。

如果启用了文章版权功能，组件将返回一个包含版权信息的 JSX 元素。这个元素包含一个 `section`，其中包含一个 `ul` 列表。列表中的每一项（`li`）分别显示了作者、URL 和版权声明。注意，作者的名字是一个 `Link` 组件，点击它将导航到 `/about` 页面。

最后，我们导出了 [`ArticleCopyright`](command:_github.copilot.openSymbolInFile?%5B%22themes%2Fnext%2Fcomponents%2FArticleCopyright.js%22%2C%22ArticleCopyright%22%5D "themes/next/components/ArticleCopyright.js") 组件，使其可以在其他文件中被导入和使用。

---
title: 示例代码块
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 633cc692
toc: true
date: 2024-07-07 12:34:49
categories:
tags:
sticky:
---

<style>
/* Container for the code block */
.code-block {
  background-color: var(--pre);
  border-radius: 8px;
  padding: 1em;
  position: relative;
  font-family: 'Courier New', Courier, monospace;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 1em 0;
}

/* Code block itself */
.code-block pre {
  margin: 0;
  overflow: auto;
  white-space: pre;
  line-height: 1.5;
  background: none;
  padding: 0;
  border: none;
}

/* Language label in the top-right corner */
.code-block::before {
  content: attr(data-lang);
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.75em;
  color: #888;
}

/* Syntax highlighting */
.code-block .token.comment,
.code-block .token.prolog,
.code-block .token.doctype,
.code-block .token.cdata {
  color: var(--prism-comment);
  font-style: italic;
}

.code-block .token.punctuation {
  color: var(--prism-punctuation);
}

.code-block .token.property,
.code-block .token.tag,
.code-block .token.constant,
.code-block .token.symbol,
.code-block .token.deleted {
  color: var(--prism-deleted);
}

.code-block .token.boolean,
.code-block .token.number {
  color: var(--prism-literal);
}

.code-block .token.selector,
.code-block .token.attr-name,
.code-block .token.string,
.code-block .token.char,
.code-block .token.builtin,
.code-block .token.inserted {
  color: var(--prism-string);
}

.code-block .token.operator,
.code-block .token.entity,
.code-block .token.url,
.code-block .language-css .token.string,
.code-block .style .token.string,
.code-block .token.variable {
  color: var(--prism-property);
}

.code-block .token.atrule,
.code-block .token.attr-value,
.code-block .token.function,
.code-block .token.class-name {
  color: var(--prism-function);
}

.code-block .token.keyword {
  color: var(--prism-keyword);
}

.code-block .token.regex,
.code-block .token.important {
  color: var(--prism-namespace);
}

/* Prism highlighting */
.code-block .hljs {
  position: relative;
}

.code-block .hljs:after {
  color: var(--t-l);
  opacity: 0.2;
  content: attr(data-language);
  font-size: 1.625rem;
  font-weight: 700;
  position: absolute;
  right: 0.5rem;
  top: 0.2rem;
  user-select: none;
  pointer-events: none;
}
</style>

# 示例代码块

下面是一个示例代码块：

<div class="code-block" data-lang="TYPESCRIPT">
<pre class="language-typescript hljs"><code class="language-typescript">
<span class="token keyword">const</span> <span class="token function-variable function">A</span> <span class="token operator">=</span> <span class="token punctuation">(</span>a <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token punctuation">{</span>
  <span class="token keyword">const</span> b <span class="token operator">=</span> <span class="token function">fibonacci</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> c <span class="token operator">=</span> <span class="token constant">B</span><span class="token punctuation">(</span>b<span class="token punctuation">,</span> a<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">return</span> c <span class="token operator">/</span> d <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token keyword">function</span> <span class="token constant">B</span><span class="token punctuation">(</span>b<span class="token punctuation">,</span> a<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">return</span> <span class="token constant">C</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span> <span class="token operator">*</span> b<span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token keyword">function</span> <span class="token constant">C</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">try</span> <span class="token punctuation">{</span>
    <span class="token function">sideEffect</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token number">1</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

<span class="token builtin">console</span><span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token constant">A</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
</div>

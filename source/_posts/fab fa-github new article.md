---
title: "\U0001F30E git rebase"
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 2b73d237
toc: true
date: 2024-05-03 02:27:51
categories:
tags:
sticky:
---
## git rebase -i删除feature的分支上某一次提交

要在Git中删除特定的提交，可以使用git rebase -i命令进行交互式变基。以下是步骤和示例代码：

打开终端。

切换到你的feature分支：git checkout feature-branch

运行交互式变基，列出要操作的提交：git rebase -i HEAD~n，其中n是从当前提交向回查看的提交数，足以包括你想要删除的提交。

在打开的编辑器中，找到你想要删除的提交，将该行的pick改为drop或者直接删除该行。

保存并关闭编辑器。

如果出现冲突，根据提示解决冲突，然后继续变基过程：git rebase --continue

如果想要取消变基，可以使用：git rebase --abort

示例：

假设你想要删除feature分支上的第三次提交，你可以这样做：

git checkout feature-branch
git rebase -i HEAD~3

在文本编辑器中，你会看到类似的内容：

pick 1a2b3c 第一次提交
pick 4d5e6f 第二次提交
pick 7g8h9i 第三次提交

要删除第三次提交，将其改为drop：

pick 1a2b3c 第一次提交
pick 4d5e6f 第二次提交
drop 7g8h9i 第三次提交

然后保存并关闭编辑器。如果没有冲突，变基操作将完成，否则你需要解决冲突并继续变基过程。

#!/bin/bash

# 函数：执行 Git 命令
execute_git_command() {
  echo "正在执行: git $@"
  git "$@" || { echo "执行 git $@ 命令失败" >&2; exit 1; }
}

# 检查是否在 Git 仓库中
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "错误：当前目录不是一个 Git 仓库" >&2
  exit 1
fi

# 执行 hexo g 命令（如果存在）
if command -v hexo > /dev/null 2>&1; then
  echo "正在执行: hexo g"
  hexo g || { echo "执行 hexo g 命令失败" >&2; exit 1; }
else
  echo "hexo 未安装，跳过生成静态文件步骤"
fi

# 执行 git pull 命令
execute_git_command pull

# 执行 git add 命令
execute_git_command add -A

# 从命令行参数获取提交信息，如果没有提供，则使用默认格式
commit_message="${1:-Site updated: $(date +%Y-%m-%d\ %H:%M:%S)}"

# 执行 git commit 命令
execute_git_command commit -m "$commit_message"

# 执行 git push 命令
execute_git_command push

echo "代码已成功推送到远程仓库！"
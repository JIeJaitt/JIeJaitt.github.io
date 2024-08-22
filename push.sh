#!/bin/bash

set -e  # 遇到错误时退出
set -u  # 使用未初始化变量时退出

# 函数：执行 Git 命令
execute_git_command() {
  local command=("$@")  # 将所有参数作为一个数组
  echo "正在执行: git ${command[*]}"
  git "${command[@]}" || {
    echo "执行 git ${command[*]} 命令失败" >&2
    exit 1
  }
}

# 检查 Git 仓库
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "错误：当前目录不是一个 Git 仓库" >&2
  exit 1
fi

# 执行 hexo g 命令（如果存在）
if command -v hexo > /dev/null 2>&1; then
  echo "正在执行: hexo g"
  hexo g || {
    echo "执行 hexo g 命令失败" >&2
    exit 1
  }
else
  echo "hexo 未安装，跳过生成静态文件步骤"
fi

# 执行 git pull、add、commit 和 push 命令
execute_git_command pull
execute_git_command add -A

# 获取当前时间作为提交信息
commit_message="Site updated: $(date +%Y-%m-%d\ %H:%M:%S)"
execute_git_command commit -m "$commit_message"
execute_git_command push

echo "代码已成功推送到远程仓库！"
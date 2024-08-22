#!/bin/bash

# 定义颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # 无颜色，恢复默认

# 函数：执行 Git 命令
execute_git_command() {
  local command=("$@")  # 将所有参数作为一个数组
  echo -e "${YELLOW}正在执行: git ${command[*]}${NC}"
  git "${command[@]}" || {
    echo -e "${RED}执行 git ${command[*]} 命令失败${NC}" >&2
    exit 1
  }
}

# 检查 Git 仓库
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo -e "${RED}错误：当前目录不是一个 Git 仓库${NC}" >&2
  exit 1
fi

# 执行 hexo g 命令（如果存在）
if command -v hexo > /dev/null 2>&1; then
  echo -e "${YELLOW}正在执行: hexo g${NC}"
  hexo g || {
    echo -e "${RED}执行 hexo g 命令失败${NC}" >&2
    exit 1
  }
else
  echo -e "${GREEN}hexo 未安装，跳过生成静态文件步骤${NC}"
fi

# 执行 git pull、add、commit 和 push 命令
execute_git_command pull
execute_git_command add -A

# 获取当前时间作为提交信息
commit_message="Site updated: $(date +%Y-%m-%d\ %H:%M:%S)"
execute_git_command commit -m "$commit_message"
execute_git_command push

echo -e "${GREEN}代码已成功推送到远程仓库！${NC}"
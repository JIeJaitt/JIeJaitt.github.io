package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"
	"C"
)

func runCommand(command string, args ...string) error {
	cmd := exec.Command(command, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	fmt.Printf("正在执行: %s %s\n", command, args)
	return cmd.Run()
}

func main() {
	// 获取当前时间
	currentTime := time.Now()

	// 格式化时间戳
	timestamp := currentTime.Format("2006-01-02 15:04:05")

	// 构造commit消息
	commitMessage := fmt.Sprintf("Site updated: %s", timestamp)

	// 执行hexo g命令
	if err := runCommand("hexo", "g"); err != nil {
		log.Fatal("执行 hexo g 命令失败:", err)
	}

	// 执行git pull命令
	if err := runCommand("git", "pull"); err != nil {
		log.Fatal("执行 git pull 命令失败:", err)
	}

	// 执行git add命令
	if err := runCommand("git", "add", "-A"); err != nil {
		log.Fatal("执行 git add 命令失败:", err)
	}

	// 执行git commit命令
	if err := runCommand("git", "commit", "-m", commitMessage); err != nil {
		log.Fatal("执行 git commit 命令失败:", err)
	}

	// 执行git push命令
	if err := runCommand("git", "push"); err != nil {
		log.Fatal("执行 git push 命令失败:", err)
	}

	fmt.Println("代码已成功推送到远程仓库！")
}
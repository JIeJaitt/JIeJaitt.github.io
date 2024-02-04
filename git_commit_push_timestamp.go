package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"
)

func main() {
	// 获取当前时间
	currentTime := time.Now()

	// 格式化时间戳
	timestamp := currentTime.Format("2006-01-02 15:04:05")

	// 构造commit消息
	commitMessage := fmt.Sprintf("Site updated: %s", timestamp)

	// 执行git add命令
	cmdAdd := exec.Command("git", "add", "-A")
	cmdAdd.Stdout = os.Stdout
	cmdAdd.Stderr = os.Stderr
	if err := cmdAdd.Run(); err != nil {
		log.Fatal(err)
	}

	// 执行git commit命令
	cmdCommit := exec.Command("git", "commit", "-m", commitMessage)
	cmdCommit.Stdout = os.Stdout
	cmdCommit.Stderr = os.Stderr
	if err := cmdCommit.Run(); err != nil {
		log.Fatal(err)
	}

	// 执行git push命令
	cmdPush := exec.Command("git", "push")
	cmdPush.Stdout = os.Stdout
	cmdPush.Stderr = os.Stderr
	if err := cmdPush.Run(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("代码已成功推送到远程仓库！")
}
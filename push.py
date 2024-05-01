import subprocess
from datetime import datetime

def main():
    # 获取当前时间
    current_time = datetime.now()

    # 格式化时间戳
    timestamp = current_time.strftime("%Y-%m-%d %H:%M:%S")

    # 构造commit消息
    commit_message = "Site updated: " + timestamp

    # 执行git add命令
    try:
        subprocess.check_call(["git", "add", "-A"])
    except subprocess.CalledProcessError as e:
        print(e)
        exit(1)

    # 执行git commit命令
    try:
        subprocess.check_call(["git", "commit", "-m", commit_message])
    except subprocess.CalledProcessError as e:
        print(e)
        exit(1)

    # 执行git push命令
    try:
        subprocess.check_call(["git", "push"])
    except subprocess.CalledProcessError as e:
        print(e)
        exit(1)

    print("代码已成功推送到远程仓库！")

if __name__ == "__main__":
    main()
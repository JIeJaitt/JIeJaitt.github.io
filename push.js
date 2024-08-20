const { exec } = require('child_process');

const execGitCommand = (command, successMessage, errorMessage, callback) => {
  console.log(`正在执行: ${command}`);
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`错误: ${errorMessage}\n${stderr}`);
      process.exit(1);
    } else {
      console.log(`${successMessage}\n${stdout}`);
    }
    if (callback) {
      callback();
    }
  });
};

const pullAndCommit = () => {
  const currentTime = new Date();
  const timestamp = currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  const commitMessage = `Site updated: ${timestamp}`;

  // 执行 hexo g 命令
  execGitCommand(
    'hexo g',
    'Hexo 已成功生成静态文件。',
    '执行 hexo g 命令失败。',
    () => {
      // 执行 git add 命令
      execGitCommand(
        'git add -A',
        '所有更改已成功添加到暂存区。',
        '执行 git add 命令失败。',
        () => {
          // 执行 git commit 命令
          execGitCommand(
            `git commit -m "${commitMessage}"`,
            '更改已成功提交。',
            '执行 git commit 命令失败。',
            () => {
              // 执行 git pull 命令
              execGitCommand(
                'git pull',
                '远端仓库的更改已成功拉取并合并。',
                '执行 git pull 命令失败。',
                () => {
                  // 执行 git push 命令
                  execGitCommand(
                    'git push',
                    '代码已成功推送到远程仓库。',
                    '执行 git push 命令失败。'
                  );
                }
              );
            }
          );
        }
      );
    }
  );
};

// 启动流程
pullAndCommit();
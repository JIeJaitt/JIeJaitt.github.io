const { exec } = require('child_process');

// 获取当前时间
const currentTime = new Date();

// 格式化时间戳
const timestamp = currentTime.toISOString().replace('T', ' ').substring(0, 19);

// 构造commit消息
const commitMessage = `Site updated: ${timestamp}`;

// 执行git命令的函数
function executeCommand(command, args) {
  return new Promise((resolve, reject) => {
    const cmd = exec(`${command} ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });

    cmd.stdout.pipe(process.stdout);
    cmd.stderr.pipe(process.stderr);
  });
}

// 执行git add命令
executeCommand('git', ['add', '-A'])
  .then(() => executeCommand('git', ['commit', '-m', `"${commitMessage}"`]))
  .then(() => executeCommand('git', ['push']))
  .then(() => console.log('代码已成功推送到远程仓库！'))
  .catch(err => console.error('Failed:', err));

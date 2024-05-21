const { exec } = require('child_process');

// 获取当前时间
const currentTime = new Date();

// 格式化时间戳
const timestamp = currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');

// 构造commit消息
const commitMessage = `Site updated: ${timestamp}`;

// 执行git add命令
exec('git add -A', (err, stdout, stderr) => {
  if (err) {
    console.error(`执行git add命令时出错: ${err}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);

  // 执行git commit命令
  exec(`git commit -m "${commitMessage}"`, (err, stdout, stderr) => {
    if (err) {
      console.error(`执行git commit命令时出错: ${err}`);
      return;
    }
    console.log(stdout);
    console.error(stderr);

    // 执行git push命令
    exec('git push', (err, stdout, stderr) => {
      if (err) {
        console.error(`执行git push命令时出错: ${err}`);
        return;
      }
      console.log(stdout);
      console.error(stderr);

      console.log('代码已成功推送到远程仓库！');
    });
  });
});
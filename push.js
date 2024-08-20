import('child_process').then(({ exec }) => {
  const pullAndCommit = () => {
    // 获取当前时间并格式化时间戳
    const currentTime = new Date();
    const timestamp = currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    // 构造commit消息
    const commitMessage = `Site updated: ${timestamp}`;

    // 执行git add命令
    exec('git add -A', (err, stdout, stderr) => {
      if (err) {
        console.error(`执行git add命令失败: ${stderr}`);
        process.exit(1);
      }

      // 执行git commit命令
      exec(`git commit -m "${commitMessage}"`, (err, stdout, stderr) => {
        if (err) {
          console.error(`执行git commit命令失败: ${stderr}`);
          process.exit(1);
        }

        // 执行git push命令
        exec('git push', (err, stdout, stderr) => {
          if (err) {
            console.error(`执行git push命令失败: ${stderr}`);
            process.exit(1);
          }

          console.log('代码已成功推送到远程仓库！');
        });
      });
    });
  };

  // 执行git pull命令
  exec('git pull', (err, stdout, stderr) => {
    if (err) {
      console.error(`执行git pull命令失败: ${stderr}`);
      // 可以选择退出或者继续执行pullAndCommit
      process.exit(1);
    }
    console.log('远端仓库已成功拉取。');
    // 拉取成功后执行后续的git操作
    pullAndCommit();
  });
});
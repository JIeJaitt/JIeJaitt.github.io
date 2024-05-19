const { exec } = require('child_process');

function getCurrentTimestamp() {
    // Get the current time
    const currentTime = new Date();

    // Format the timestamp
    const timestamp = currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    return timestamp;
}

function executeCommand(command) {
    // Execute the system command
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Command failed: ${command}`);
            process.exit(1);
        }
    });
}

function main() {
    // Get the current formatted timestamp
    const timestamp = getCurrentTimestamp();

    // Construct the commit message
    const commitMessage = `Site updated: ${timestamp}`;

    // Execute git add command
    executeCommand('git add -A');

    // Execute git commit command
    executeCommand(`git commit -m "${commitMessage}"`);

    // Execute git push command
    executeCommand('git push');

    console.log('代码已成功推送到远程仓库！');
}

main();
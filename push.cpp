#include <iostream>
#include <cstdlib>
#include <ctime>
#include <sstream>
#include <cstdio>

std::string getCurrentTimestamp() {
    // Get the current time
    std::time_t currentTime = std::time(nullptr);

    // Format the timestamp
    char buffer[80];
    std::strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", std::localtime(&currentTime));
    return std::string(buffer);
}

void executeCommand(const std::string& command) {
    // Execute the system command
    int result = std::system(command.c_str());
    if (result != 0) {
        std::cerr << "Command failed: " << command << std::endl;
        std::exit(EXIT_FAILURE);
    }
}

int main() {
    // Get the current formatted timestamp
    std::string timestamp = getCurrentTimestamp();

    // Construct the commit message
    std::stringstream commitMessage;
    commitMessage << "Site updated: " << timestamp;

    // Execute git add command
    executeCommand("git add -A");

    // Execute git commit command
    executeCommand("git commit -m \"" + commitMessage.str() + "\"");

    // Execute git push command
    executeCommand("git push");

    std::cout << "代码已成功推送到远程仓库！" << std::endl;

    return 0;
}
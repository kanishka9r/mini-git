#pragma once

#include <string>
#include <unordered_map>
using namespace std;

struct RemoteInfo {
    string owner;
    string repo;
    string url;
};

class ConfigManager {
public:
    // Token management
    static void saveToken(const string& token);
    static string loadToken();
    static bool isLoggedIn();

    // Remote repository info
    static void saveRemote(const string& owner, const string& repo, const string& url);
    static RemoteInfo loadRemote();
    static bool hasRemote();

    // Generic key-value access
    static void set(const string& key, const string& value);
    static string get(const string& key, const string& defaultValue = "");

private:
    static const string CONFIG_PATH;
    static void writeConfig(const std::unordered_map<string, string>& data);
    static std::unordered_map<string, string> readConfig();
};

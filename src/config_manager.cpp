#include "config_manager.h"
#include <fstream>
#include <unordered_map>
#include <sys/stat.h>

using namespace std;

const string ConfigManager::CONFIG_PATH = ".vcs/config";

//  Internal helpers 

unordered_map<string, string> ConfigManager::readConfig()
{
    unordered_map<string, string> data;
    ifstream file(CONFIG_PATH);
    string line;

    while (getline(file, line))
    {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        size_t pos = line.find('=');
        if (pos == string::npos)
            continue;

        string key = line.substr(0, pos);
        string value = line.substr(pos + 1);
        data[key] = value;
    }

    return data;
}

void ConfigManager::writeConfig(const unordered_map<string, string>& data)
{
    ofstream file(CONFIG_PATH, ios::trunc);

    for (const auto& pair : data)
    {
        file << pair.first << "=" << pair.second << "\n";
    }
}

//  Generic key-value access 

void ConfigManager::set(const string& key, const string& value)
{
    auto data = readConfig();
    data[key] = value;
    writeConfig(data);
}

string ConfigManager::get(const string& key, const string& defaultValue)
{
    auto data = readConfig();
    auto it = data.find(key);

    if (it != data.end())
        return it->second;

    return defaultValue;
}

//  Token management 

void ConfigManager::saveToken(const string& token)
{
    set("token", token);
}

string ConfigManager::loadToken()
{
    return get("token");
}

bool ConfigManager::isLoggedIn()
{
    return !loadToken().empty();
}

//  Remote repository info 

void ConfigManager::saveRemote(const string& owner, const string& repo, const string& url)
{
    auto data = readConfig();
    data["remote_owner"] = owner;
    data["remote_repo"] = repo;
    data["remote_url"] = url;
    writeConfig(data);
}

RemoteInfo ConfigManager::loadRemote()
{
    auto data = readConfig();
    return {
        data["remote_owner"],
        data["remote_repo"],
        data["remote_url"]
    };
}

bool ConfigManager::hasRemote()
{
    auto data = readConfig();
    return !data["remote_owner"].empty() && !data["remote_repo"].empty();
}

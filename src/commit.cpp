#include "commit.h"
#include <fstream>
#include <stdexcept>

using namespace std;

Commit Commit::getCommit(const string &commitHash)
{
    string path = ".vcs/commits/" + commitHash;
    ifstream commitFile(path);

    if (!commitFile)
    {
        throw runtime_error("Commit not found");
    }

    Commit c;
    getline(commitFile, c.hash);
    getline(commitFile, c.parentHash);

    string temp_time;
    getline(commitFile, temp_time);
    c.timestamp = (time_t)stoll(temp_time);

    getline(commitFile, c.message);

    string line;
    while (getline(commitFile, line))
    {
        int pos = line.find(":");
        if (pos == string::npos)
            continue;

        string filename = line.substr(0, pos);
        string objectHash = line.substr(pos + 1);
        c.files[filename] = objectHash;
    }

    return c;
}

void Commit::saveCommitRaw(
    const string &commitHash,
    const string &parentHash,
    time_t now,
    const string &message,
    const unordered_map<string, string> &stagingArea)
{
    string path = ".vcs/commits/" + commitHash;
    ofstream commitFile(path);

    commitFile << commitHash << endl;
    commitFile << parentHash << endl;
    commitFile << now << endl;
    commitFile << message << endl;

    for (auto it : stagingArea)
    {
        commitFile << it.first << ":" << it.second << endl;
    }
}

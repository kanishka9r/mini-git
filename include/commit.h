#pragma once

#include <string>
#include <unordered_map>
#include <ctime>

using namespace std;

struct Commit {
    string hash;                         // unique commit id
    string parentHash;                   // previous commit id
    string message;                      // commit message
    time_t timestamp;                    // commit time
    unordered_map<string, string> files; // filename -> file content hash
    
    static Commit getCommit(const string &commitHash);

    static void saveCommitRaw(
        const string &commitHash,
        const string &parentHash,
        time_t now,
        const string &message,
        const unordered_map<string, string> &stagingArea);
};


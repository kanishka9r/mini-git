#ifndef COMMIT_H
#define COMMIT_H

#include <string>
#include <unordered_map>
#include <ctime>

using namespace std;

struct Commit {
    string hash;                    // unique commit id
    string parentHash;              // previous commit id
    string message;                 // commit message
    time_t timestamp;               // commit time
    unordered_map<string, string> files; 
    // filename -> file content hash
};

#endif

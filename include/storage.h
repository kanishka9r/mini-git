#pragma once

#include <string>
#include <unordered_map>

using namespace std;

enum class StageOperation {
    OP_ADD,
    OP_MODIFY,
    OP_DELETE
};

struct StageEntry {
    StageOperation operation;
    string hash;
};

class Storage
{
public:
    // generate hash for content
    static string computeHash(const string &content);

    // store object using hash
    static void storeObject(const string &content);

    // retrieve stored object
    static string getObject(const string &hash);

    static unordered_map<string, StageEntry> readIndex();
    static void writeIndex(const unordered_map<string, StageEntry>& stagingArea);

    static void clearIndex();
};


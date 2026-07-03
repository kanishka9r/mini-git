#pragma once
#include <string>
#include <unordered_map>
#include <vector>
#include <commit.h>
#include <unordered_set>

using namespace std;

struct FileChange {
    string filename;
    string status;  // "modified", "added", "deleted"
    string oldHash;
    string newHash;
};

class VCS {
public:
    static void init();
    static void add(const string& filename);
    static void commit(const string& message);
    static void branch(const string& name);
    static void checkout(const string& name);
    static void log();
    static void logGraph();

    static string commitAndReturnHash(const string& message);
    static vector<Commit> getCommitHistory();
    static vector<FileChange> getModifiedFiles();
    static bool isInitialized();
    static void addMultiple(const vector<string>& filenames);
};

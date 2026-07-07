#pragma once
#include <string>
#include <unordered_map>
#include <vector>
#include <commit.h>
#include <unordered_set>

using namespace std;

// Represents a file change detected in the working directory
struct FileChange {
    string filename;
    string status;  // "modified", "added", "deleted"
    string oldHash;
    string newHash;
};

class VCS {
public:
    static string normalizePath(string path);
    static void cleanWorkingDirectory(const unordered_map<string, string>& currentFiles, const unordered_map<string, string>& targetFiles);

    //  Existing CLI API 
    static void init();
    static void add(const string& filename);
    static void commit(const string& message);
    static void branch(const string& name);
    static void checkout(const string& name);
    static void log();
    static void logGraph();

    //  New GUI-facing API (returns data instead of printing) 
    static string commitAndReturnHash(const string& message);
    static vector<Commit> getCommitHistory();
    static vector<FileChange> getModifiedFiles();
    static bool isInitialized();
    static void addMultiple(const vector<string>& filenames);
};

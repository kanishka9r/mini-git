#pragma once
#include <string>
#include <unordered_map>
#include <unordered_set>

using namespace std;

class VCS {
public:
    static void init();
    static void add(const string& filename);
    static void commit(const string& message);
    static void branch(const string& name);
    static void checkout(const string& name);
    static void log();
    static void logGraph();
    static vector<string> bfsTraversal(const string& start);
    static unordered_set<string> getAncestors(const string& commitHash);
    static unordered_map<string, string> stagingArea;
};

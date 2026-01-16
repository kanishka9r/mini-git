#pragma once
#include <string>
#include <unordered_map>

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
    static unordered_map<string, string> stagingArea;
};

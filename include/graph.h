#pragma once
#include <vector>
#include <unordered_set>
#include <string>

using namespace std;

class Graph
{
public:
    static unordered_set<string> getAncestors(const string& commitHash);
    static vector<string> bfsTraversal(const string& start);
    static void dfsAncestors(const string &commit, unordered_set<string> &visited);
    static vector<string> getParents(const string &hash);
};

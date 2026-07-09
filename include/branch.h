#pragma once
#include <string>
#include <vector>
using namespace std;

class Branch
{
public:
    static void createBranch(const string& name);
    static string getHeadCommit();
    static string getCurrentBranch();
    static void setCurrentBranch(const string &s);
    static void updateBranch(const string &name, const string &hash);
    static string getHead(const string &branch);
    static void updateHead(const string &branch, const string &hash);
    static vector<string> getAllBranches();
};

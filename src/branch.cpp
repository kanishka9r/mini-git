#include "branch.h"
#include <iostream>
#include <sys/stat.h>
#include <fstream>

using namespace std;


void Branch::createBranch(const string& name){
    string path = ".vcs/refs/" + name;
    struct stat st;

    if (stat(path.c_str(), &st) == 0)
    {
        cout << "Branch already exists" << endl;
        return;
    }

    string currentBranch;
    ifstream headFile(".vcs/HEAD");
    getline(headFile, currentBranch);
    headFile.close();

    string commitHash;
    ifstream f(".vcs/refs/" + currentBranch);
    if (f) {
        getline(f, commitHash);
        f.close();
    }

    if (commitHash.empty()) {
        cout << "Cannot create a branch before the first commit." << endl;
        return;
    }

    ofstream newBranch(path);
    newBranch << commitHash;
    newBranch.close();

    cout << "Created branch " << name << endl;
}

string Branch::getHeadCommit()
{
    ifstream headFile(".vcs/HEAD");
    string branchName;
    getline(headFile, branchName);
    headFile.close();

    string branchPath = ".vcs/refs/" + branchName;

    ifstream branchFile(branchPath);
    string commitHash;
    getline(branchFile, commitHash);
    branchFile.close();

    return commitHash;
}

string Branch::getCurrentBranch()
{
    ifstream f(".vcs/HEAD");
    string branch;
    getline(f, branch);
    f.close();

    return branch;
}

void Branch::setCurrentBranch(const string &name)
{
    ofstream headFile(".vcs/HEAD");
    headFile << name;
    headFile.close();
}

void Branch::updateBranch(const string &name, const string &hash)
{
    string path = ".vcs/refs/" + name;
    ofstream branch(path);
    branch << hash;
    branch.close();
}

string Branch::getHead(const string &branch)
{
    string parentHash = "";
    ifstream refFile(".vcs/refs/" + branch);

    if (refFile)
    {
        getline(refFile, parentHash);
    }

    return parentHash;
}

void Branch::updateHead(const string &branch, const string &hash)
{
    ofstream refUpdate(".vcs/refs/" + branch);
    refUpdate << hash;
}

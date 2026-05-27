#include <iostream>
#include <fstream>
#include <set>
#include <direct.h>
#include <sys/stat.h>
#include <time.h>
#include "vcs.h"
#include "storage.h"
#include "commit.h"
#include "branch.h"
#include "graph.h"
#include <queue>

using namespace std;


void VCS::init()
{
    struct stat st;

    // check if repo exists
    if (stat(".vcs", &st) == 0)
    {
        cout << "Repository already initialized!" << endl;
        return;
    }

    _mkdir(".vcs");
    _mkdir(".vcs/objects");
    _mkdir(".vcs/commits");
    _mkdir(".vcs/refs");

    ofstream indexFile(".vcs/index");
    indexFile.close();

    ofstream headFile(".vcs/HEAD");
    headFile << "main";
    headFile.close();

    cout << "Initialized empty VCS repository!" << endl;
}

void VCS::add(const string &filename)
{
    // Repo check
    struct stat st;
    if (stat(".vcs", &st) != 0)
    {
        cout << "Repository not initialized!" << endl;
        return;
    }

    ifstream file(filename);
    if (!file)
    {
        cout << "File not found!" << endl;
        return;
    }

    string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());

    const string hash = Storage::computeHash(content);

    //? maybe we can pass the hash calculated above
    Storage::storeObject(content);

    //! changed the logic
    //* now we read the index file again and then append the new file
    //* to avoid duplication
    auto stagingArea = Storage::readIndex();

    stagingArea[filename] = hash;

    ofstream index(".vcs/index", ios::trunc);

    for (auto &p : stagingArea)
    {
        index << p.first << ":" << p.second << endl;
    }

    index.close();

    cout << "Added " + filename + " to staging" << endl;
}

void VCS::commit(const string &message)
{
    // Repo check
    struct stat st;
    if (stat(".vcs", &st) != 0)
    {
        cout << "Repository not initialized!" << endl;
        return;
    }

    auto stagingArea = Storage::readIndex();

    if (stagingArea.empty())
    {
        cout << "Nothing to commit" << endl;
        return;
    }

    // from branch.cpp
    //! fixed the hardcoded main branch
    string currentBranch = Branch::getCurrentBranch();
    string parentHash = Branch::getHead(currentBranch);

    time_t now = time(0);

    string raw = message + parentHash + to_string(now);
    //! changed the hashing method
    for (auto &p : stagingArea)
    {
        raw += p.first + p.second;
    }

    string commitHash = Storage::computeHash(raw);

    Commit::saveCommitRaw(commitHash, parentHash, now, message, stagingArea);

    Branch::updateHead(currentBranch, commitHash);

    Storage::clearIndex();

    cout << "Committed as " << commitHash << endl;
}

void VCS::log()
{
    string current = Branch::getHeadCommit();

   if (current.empty()) {
        cout << "No commits yet\n";
        return;
    }

    set<string> visited;

    while (!current.empty() &&
        visited.find(current) == visited.end())
    {
        visited.insert(current);

        Commit c = Commit::getCommit(current);

        cout << "commit " << c.hash << endl;
        cout << "Date: " << c.timestamp << endl;
        cout << "Message: " << c.message << endl;
        cout << endl;

        current = c.parentHash;
    }
}

void VCS::logGraph()
{
    string current = Branch::getHeadCommit();
    set<string> visited; // infinite loop protection

    while (current != "" && visited.find(current) == visited.end()) {
        visited.insert(current);

        Commit c = Commit::getCommit(current);

        cout << "* " << current << " \"" << c.message << "\"\n";

        if (!c.parentHash.empty())
            cout << "|\n";

        current = c.parentHash;
    }
}

void VCS::checkout(const string &name)
{
    struct stat st;

    // Check repo exists
    if (stat(".vcs", &st) != 0)
    {
        cout << "Repository not initialized\n";
        return;
    }

    // Check branch exists
    string refPath = ".vcs/refs/" + name;
    if (stat(refPath.c_str(), &st) != 0)
    {
        cout << "Branch does not exist\n";
        return;
    }

    // Update HEAD → branch
    ofstream headFile(".vcs/HEAD");
    headFile << name;
    headFile.close();

    //  Read commit hash from branch
    ifstream refFile(refPath);
    string commitHash;
    getline(refFile, commitHash);
    refFile.close();

    if (commitHash == "")
    {
        cout << "Branch has no commits\n";
        return;
    }

    // Load commit snapshot (via API)
    Commit commit = Commit::getCommit(commitHash);

    // Restore files
    for (auto &it : commit.files)
    {
        const string &filename = it.first;
        const string &hash = it.second;

        string content = Storage::getObject(hash);

        ofstream out(filename);
        out << content;
        out.close();
    }

    cout << "Switched to branch " << name << endl;
}

void VCS::branch(const string& name){
    Branch::createBranch(name);
}

#include <iostream>
#include <fstream>
#include <set>
#include <direct.h>
#include <sys/stat.h>
#include <time.h>
#include "vcs.h"
#include "storage.h"
#include <queue>
#include "commit.h"

using namespace std;

unordered_map<string, string> VCS::stagingArea;

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
    headFile << "ref: refs/main";
    headFile.close();

    cout << "Initialized empty VCS repository!" << endl;
}

void VCS::add(const string &filename)
{
    ifstream file(filename);
    if (!file)
    {
        cout << "File not found!" << endl;
        return;
    }

    string content, line;
    while (getline(file, line))
    {
        content += line + "\n";
    }

    const string hash = Storage::computeHash(content);

    Storage::storeObject(content);

    stagingArea[filename] = hash;
    ofstream index(".vcs/index", ios::app);
    index << filename << ":" << hash << endl;
    index.close();

    cout << "Added " + filename + " to staging" << endl;
}

void VCS::commit(const string &message)
{
    ifstream index(".vcs/index");

    string line;
    stagingArea.clear();

    while (getline(index, line))
    {
        int pos = line.find(":");

        string filename = line.substr(0, pos);
        string hash = line.substr(pos + 1);

        stagingArea[filename] = hash;
    }

    index.close();

    if (stagingArea.empty())
    {
        cout << "Nothing to commit" << endl;
        return;
    }

    string parentHash = "";
    ifstream refFile(".vcs/refs/main");

    if (refFile)
    {
        getline(refFile, parentHash);
    }

    refFile.close();

    time_t now = time(0);

    string raw = message + parentHash + to_string(now);
    string commitHash = Storage::computeHash(raw);

    string path = ".vcs/commits/" + commitHash;
    ofstream commitFile(path);

    commitFile << commitHash << endl;
    commitFile << parentHash << endl;
    commitFile << now << endl;
    commitFile << message << endl;

    for (auto it : stagingArea)
    {
        commitFile << it.first << ":" << it.second << endl;
    }

    commitFile.close();

    ofstream refUpdate(".vcs/refs/main");
    refUpdate << commitHash;
    refUpdate.close();

    stagingArea.clear();
    ofstream clear(".vcs/index");
    clear.close();

    cout << "Committed as " << commitHash << endl;
}

string readHead()
{
    ifstream head(".vcs/refs/main");
    string hash;
    getline(head, hash);
    return hash;
}

bool readCommit(const string &hash, string &parent, string &message)
{
    ifstream file(".vcs/commits/" + hash);
    if (!file)
        return false;

    string dummy;
    getline(file, dummy);  // commit hash line ignore
    getline(file, parent); // parent
    string ts;
    getline(file, ts);      // timestamp
    getline(file, message); // message

    return true;
}

void VCS::log()
{
    cout << "log not implemented yet" << endl;
}

void VCS::logGraph()
{
    string current = readHead();
    set<string> visited; // infinite loop protection

    while (current != "" && visited.find(current) == visited.end()) {
        visited.insert(current);

        string parent, message;
        if (!readCommit(current, parent, message))
            break;

        cout << "* " << current << " \"" << message << "\"\n";

        if (parent != "")
            cout << "|\n";

        current = parent;
    }
}
vector<string> getParents(const string& commit)
{
    if (commit == "C3") return {"C2"};
    if (commit == "C2") return {"C1"};
    return {}; // C1 or unknown commit
}


void dfsAncestors(
    const string& commit,
    unordered_set<string>& visited
) {
    for (const string& parent : getParents(commit)) {
        if (visited.find(parent) == visited.end()) {
            visited.insert(parent);
            dfsAncestors(parent, visited);
        }
    }
}

unordered_set<string> VCS::getAncestors(const string& commitHash)
{
    unordered_set<string> visited;
    dfsAncestors(commitHash, visited);
    return visited;
}

vector<string> VCS::bfsTraversal(const string& start)
{
    vector<string> order;
    unordered_set<string> visited;
    queue<string> q;

    q.push(start);
    visited.insert(start);

    while (!q.empty())
    {
        string current = q.front();
        q.pop();

        for (const string& parent : getParents(current))
        {
            if (visited.find(parent) == visited.end())
            {
                visited.insert(parent);
                order.push_back(parent);
                q.push(parent);
            }
        }
    }

    return order;
}

void testGraphAlgorithms()
{
    cout << "BFS Traversal from C3:\n";
    auto bfs = VCS::bfsTraversal("C3");
    for (auto& x : bfs)
        cout << x << " ";
    cout << "\n";

    cout << "Ancestors of C3:\n";
    auto anc = VCS::getAncestors("C3");
    for (auto& x : anc)
        cout << x << " ";
    cout << "\n";
}


Commit VCS::getCommit(const string& hash){
    string path = ".vcs/commits/" + hash;
    ifstream commitFile(path);

    if(!commitFile){
        cout << "Commit not found!" << endl;
    }

    Commit c;
    getline(commitFile, c.hash);
    getline(commitFile, c.parentHash);

    string temp_time;
    getline(commitFile, temp_time);
    c.timestamp = (time_t)stoll(temp_time);

    getline(commitFile, c.message);

    string line;
    while(getline(commitFile, line)){
        int pos = line.find(":");

        string filename = line.substr(0, pos);
        string hash = line.substr(pos + 1);
        c.files[filename] = hash;

    }
    return c;
}

vector<string> VCS::getParents(const string& hash){
    Commit c = getCommit(hash);

    vector<string> parents; 
    if(!c.parentHash.empty()){
        parents.push_back(c.parentHash);
    }
    return parents;

}

string VCS::getHeadCommit(){
    ifstream headFile(".vcs/HEAD");
    string line;
    getline(headFile, line);
    headFile.close();

    string refPath = line.substr(5);
    string branchPath = ".vcs/" + refPath;

    ifstream branchFile(branchPath);
    string commitHash;
    getline(branchFile, commitHash);
    branchFile.close();

    return commitHash;
}

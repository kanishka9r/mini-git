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

#include <filesystem>
using namespace std;
namespace fs = std::filesystem;

string VCS::normalizePath(string path) {
    for (char& c : path) { if (c == '\\') c = '/'; }
    if (path.length() >= 2 && path[0] == '.' && path[1] == '/') {
        path = path.substr(2);
    }
    return path;
}

void VCS::cleanWorkingDirectory(const unordered_map<string, string>& currentFiles, const unordered_map<string, string>& targetFiles) {
    for (const auto& pair : currentFiles) {
        string path = pair.first;
        if (targetFiles.find(path) == targetFiles.end()) {
            try {
                fs::remove(fs::path(path));
            } catch (const fs::filesystem_error& e) {
                cout << "Error removing file: " << e.what() << endl;
            }
        }
    }
}

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

    string normFile = normalizePath(filename);
    ifstream file(normFile, ios::binary);

    auto stagingArea = Storage::readIndex();

    if (!file)
    {
        stagingArea[normFile] = "";
        cout << "Staged deletion for " + normFile << endl;
    }
    else
    {
        string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
        const string hash = Storage::computeHash(content);
        Storage::storeObject(content);
        stagingArea[normFile] = hash;
        cout << "Added " + normFile + " to staging" << endl;
    }

    ofstream index(".vcs/index", ios::trunc);
    for (auto &p : stagingArea)
    {
        index << p.first << ":" << p.second << endl;
    }
    index.close();
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

    string currentBranch = Branch::getCurrentBranch();
    if (currentBranch.empty()) {
        cout << "Cannot commit in detached HEAD state. Please checkout a branch first." << endl;
        return;
    }

    string parentHash = Branch::getHead(currentBranch);
    
    unordered_map<string, string> parentFiles;
    if (!parentHash.empty()) {
        parentFiles = Commit::getCommit(parentHash).files;
    }
    
    unordered_map<string, string> commitFiles = parentFiles;
    for (auto &p : stagingArea) {
        if (p.second == "") {
            commitFiles.erase(p.first);
        } else {
            commitFiles[p.first] = p.second;
        }
    }
    
    if (commitFiles == parentFiles) {
        cout << "Nothing to commit (empty commit)" << endl;
        return;
    }

    time_t now = time(0);
    string raw = message + parentHash + to_string(now);
    for (auto &p : commitFiles)
    {
        raw += p.first + p.second;
    }

    string commitHash = Storage::computeHash(raw);

    Commit::saveCommitRaw(commitHash, parentHash, now, message, commitFiles);

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

    // Safety check: Prevent destructive checkout
    auto changes = getModifiedFiles();
    if (!changes.empty()) {
        cout << "error: Your local changes would be overwritten by checkout. Please commit or stash them.\n";
        return;
    }

    // Check branch exists
    string refPath = ".vcs/refs/" + name;
    if (stat(refPath.c_str(), &st) != 0)
    {
        cout << "Branch does not exist\n";
        return;
    }

    // Update HEAD  branch
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

    // Load commit snapshot 
    Commit commit = Commit::getCommit(commitHash);

    // Clean working directory
    string currentHead = Branch::getHeadCommit();
    if (!currentHead.empty()) {
        Commit headCommit = Commit::getCommit(currentHead);
        cleanWorkingDirectory(headCommit.files, commit.files);
    }

    // Restore files
    for (auto &it : commit.files)
    {
        const string &filename = it.first;
        const string &hash = it.second;

        string content = Storage::getObject(hash);

        fs::path p(filename);
        if (p.has_parent_path()) {
            fs::create_directories(p.parent_path());
        }

        ofstream out(filename, ios::binary);
        out << content;
        out.close();
    }

    cout << "Switched to branch " << name << endl;
}

void VCS::branch(const string& name){
    Branch::createBranch(name);
}

//  New GUI-facing API 

bool VCS::isInitialized() {
    struct stat st;
    return stat(".vcs", &st) == 0;
}

string VCS::commitAndReturnHash(const string& message) {
    if (!isInitialized()) return "";

    auto stagingArea = Storage::readIndex();
    if (stagingArea.empty()) return "";

    string currentBranch = Branch::getCurrentBranch();
    string parentHash = Branch::getHead(currentBranch);
    time_t now = time(0);

    string raw = message + parentHash + to_string(now);
    for (auto &p : stagingArea) {
        raw += p.first + p.second;
    }

    string commitHash = Storage::computeHash(raw);
    Commit::saveCommitRaw(commitHash, parentHash, now, message, stagingArea);
    Branch::updateHead(currentBranch, commitHash);
    Storage::clearIndex();

    return commitHash;
}

vector<Commit> VCS::getCommitHistory() {
    vector<Commit> history;
    if (!isInitialized()) return history;

    string current = Branch::getHeadCommit();
    set<string> visited;

    while (!current.empty() && visited.find(current) == visited.end()) {
        visited.insert(current);
        Commit c = Commit::getCommit(current);
        history.push_back(c);
        current = c.parentHash;
    }

    return history;
}

void VCS::addMultiple(const vector<string>& filenames) {
    if (!isInitialized()) return;
    
    auto stagingArea = Storage::readIndex();
    
    for (const string& filename : filenames) {
        string normFile = normalizePath(filename);
        ifstream file(normFile, ios::binary);
        if (!file) {
            stagingArea[normFile] = "";
            continue;
        }
        
        string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
        string hash = Storage::computeHash(content);
        Storage::storeObject(content);
        
        stagingArea[normFile] = hash;
    }
    
    ofstream index(".vcs/index", ios::trunc);
    for (auto &p : stagingArea) {
        index << p.first << ":" << p.second << endl;
    }
    index.close();
}

vector<FileChange> VCS::getModifiedFiles() {
    vector<FileChange> changes;
    if (!isInitialized()) return changes;

    string current = Branch::getHeadCommit();
    unordered_map<string, string> headFiles;
    if (!current.empty()) {
        Commit headCommit = Commit::getCommit(current);
        headFiles = headCommit.files;
    }

    try {
        for (auto it = fs::recursive_directory_iterator("."); it != fs::recursive_directory_iterator(); ++it) {
            if (it->is_directory()) {
                string name = it->path().filename().string();
                if (name == ".vcs" || name == ".git" || name == "build" || name == "client" || name == "node_modules") {
                    it.disable_recursion_pending();
                    continue;
                }
            } else if (it->is_regular_file()) {
                string path = it->path().string();
                path = normalizePath(path);

                ifstream file(path, ios::binary);
                if (file) {
                    string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
                    string hash = Storage::computeHash(content);
                    
                    if (headFiles.find(path) == headFiles.end()) {
                        FileChange change;
                        change.filename = path;
                        change.status = "added";
                        change.oldHash = "";
                        change.newHash = hash;
                        changes.push_back(change);
                    } else if (headFiles[path] != hash) {
                        FileChange change;
                        change.filename = path;
                        change.status = "modified";
                        change.oldHash = headFiles[path];
                        change.newHash = hash;
                        changes.push_back(change);
                    }
                    
                    headFiles.erase(path);
                }
            }
        }
    } catch (const fs::filesystem_error& e) {
        cout << "Filesystem error: " << e.what() << endl;
    }

    for (auto& p : headFiles) {
        FileChange change;
        change.filename = p.first;
        change.status = "deleted";
        change.oldHash = p.second;
        change.newHash = "";
        changes.push_back(change);
    }
    
    return changes;
}

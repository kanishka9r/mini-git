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
#include <algorithm>

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
    addMultiple({filename});
    
    // Just for CLI output, assume it was processed
    cout << "Processed " << filename << " for staging" << endl;
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
        if (p.second.operation == StageOperation::OP_DELETE) {
            commitFiles.erase(p.first);
        } else {
            commitFiles[p.first] = p.second.hash;
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
    if (stat(".vcs", &st) != 0) {
        throw runtime_error("Repository not initialized");
    }

    string refPath = ".vcs/refs/" + name;
    if (stat(refPath.c_str(), &st) != 0) {
        throw runtime_error("Branch does not exist");
    }

    auto stagingArea = Storage::readIndex();
    if (!stagingArea.empty()) {
        throw runtime_error("You have staged changes. Please commit or stash them before checking out.");
    }

    string currentBranch = Branch::getCurrentBranch();
    if (currentBranch == name) {
        throw runtime_error("Already on branch " + name);
    }

    string currentHeadHash = Branch::getHeadCommit();
    unordered_map<string, string> headFiles;
    if (!currentHeadHash.empty()) {
        headFiles = Commit::getCommit(currentHeadHash).files;
    }

    ifstream refFile(refPath);
    string targetCommitHash;
    getline(refFile, targetCommitHash);
    refFile.close();

    if (targetCommitHash == "") {
        throw runtime_error("Branch has no commits");
    }

    unordered_map<string, string> targetFiles = Commit::getCommit(targetCommitHash).files;

    if (currentHeadHash != targetCommitHash) {
        // Safety check: Prevent destructive checkout
        for (auto it = fs::recursive_directory_iterator("."); it != fs::recursive_directory_iterator(); ++it) {
            if (it->is_directory()) {
                string dirName = it->path().filename().string();
                if (dirName == ".vcs" || dirName == ".git" || dirName == "build" || dirName == "client" || dirName == "node_modules") {
                    it.disable_recursion_pending();
                    continue;
                }
            } else if (it->is_regular_file()) {
                string path = normalizePath(it->path().string());
                ifstream file(path, ios::binary);
                if (file) {
                    string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
                    string wtHash = Storage::computeHash(content);
                    
                    bool isUntracked = (headFiles.find(path) == headFiles.end());
                    bool isModified = (!isUntracked && headFiles[path] != wtHash);
                    
                    if (isUntracked || isModified) {
                        if (targetFiles.find(path) != targetFiles.end()) {
                            if (targetFiles[path] != wtHash) {
                                throw runtime_error("Checkout would overwrite local changes in " + path);
                            }
                        } else if (isModified) {
                            throw runtime_error("Checkout would delete local changes in " + path);
                        }
                    }
                }
            }
        }

        // Clean working directory (delete files tracked by HEAD but not by target branch)
        cleanWorkingDirectory(headFiles, targetFiles);

        // Restore files
        for (auto &it : targetFiles) {
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
    }

    // Update HEAD branch only after success
    ofstream headFile(".vcs/HEAD");
    headFile << name;
    headFile.close();

    cout << "Switched to branch " << name << endl;
}

void VCS::branch(const string& name){
    Branch::createBranch(name);
}

void VCS::unstage(const string& filename) {
    struct stat st;
    if (stat(".vcs", &st) != 0) { cout << "Repository not initialized!" << endl; return; }
    
    string normFile = normalizePath(filename);
    auto stagingArea = Storage::readIndex();
    
    if (stagingArea.find(normFile) != stagingArea.end()) {
        stagingArea.erase(normFile);
        Storage::writeIndex(stagingArea);
        cout << "Unstaged " << normFile << endl;
    } else {
        cout << "File is not staged." << endl;
    }
}

void VCS::untrack(const string& filename) {
    struct stat st;
    if (stat(".vcs", &st) != 0) { cout << "Repository not initialized!" << endl; return; }
    
    string normFile = normalizePath(filename);
    auto stagingArea = Storage::readIndex();
    
    string current = Branch::getHeadCommit();
    unordered_map<string, string> headFiles;
    if (!current.empty()) {
        headFiles = Commit::getCommit(current).files;
    }
    
    if (headFiles.find(normFile) != headFiles.end()) {
        stagingArea[normFile] = {StageOperation::OP_DELETE, ""};
        cout << "Untracked " << normFile << " (It will be removed from the next commit)" << endl;
    } else {
        stagingArea.erase(normFile);
        cout << "File was not tracked in HEAD, removed from staging if it was staged." << endl;
    }
    
    Storage::writeIndex(stagingArea);
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

    // Get parent commit files to inherit
    unordered_map<string, string> treeFiles;
    if (!parentHash.empty()) {
        Commit parent = Commit::getCommit(parentHash);
        treeFiles = parent.files;
    }

    // Apply staged changes to the tree
    for (auto &p : stagingArea) {
        if (p.second.operation == StageOperation::OP_DELETE) {
            treeFiles.erase(p.first); // Deleted file
        } else {
            treeFiles[p.first] = p.second.hash; // Added/Modified file
        }
    }

    unordered_map<string, string> originalParentFiles;
    if (!parentHash.empty()) {
        originalParentFiles = Commit::getCommit(parentHash).files;
    }
    
    if (treeFiles == originalParentFiles) {
        throw runtime_error("Nothing to commit (empty commit)");
    }

    // Compute hash based on the entire new tree
    string raw = message + parentHash + to_string(now);
    for (auto &p : treeFiles) {
        raw += p.first + p.second;
    }

    string commitHash = Storage::computeHash(raw);
    Commit::saveCommitRaw(commitHash, parentHash, now, message, treeFiles);
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
    string current = Branch::getHeadCommit();
    unordered_map<string, string> headFiles;
    if (!current.empty()) {
        headFiles = Commit::getCommit(current).files;
    }
    
    for (const string& filename : filenames) {
        string normFile = normalizePath(filename);
        ifstream file(normFile, ios::binary);
        if (!file) {
            // If deleted, stage the deletion only if it exists in HEAD
            if (headFiles.find(normFile) != headFiles.end()) {
                stagingArea[normFile] = {StageOperation::OP_DELETE, ""};
            } else {
                stagingArea.erase(normFile);
            }
            continue;
        }
        
        string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
        string hash = Storage::computeHash(content);
        
        // Don't stage if unchanged from HEAD
        if (headFiles.find(normFile) != headFiles.end()) {
            if (headFiles[normFile] == hash) {
                stagingArea.erase(normFile);
            } else {
                Storage::storeObject(content);
                stagingArea[normFile] = {StageOperation::OP_MODIFY, hash};
            }
        } else {
            Storage::storeObject(content);
            stagingArea[normFile] = {StageOperation::OP_ADD, hash};
        }
    }
    
    Storage::writeIndex(stagingArea);
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

StagingStatus VCS::getStagingStatus() {
    StagingStatus status;
    if (!isInitialized()) return status;

    string current = Branch::getHeadCommit();
    unordered_map<string, string> headFiles;
    if (!current.empty()) {
        headFiles = Commit::getCommit(current).files;
    }

    auto stagingArea = Storage::readIndex();
    unordered_map<string, string> wtFiles;

    set<string> allPaths;
    for (const auto& p : headFiles) allPaths.insert(p.first);
    for (const auto& p : stagingArea) allPaths.insert(p.first);

    try {
        for (auto it = fs::recursive_directory_iterator("."); it != fs::recursive_directory_iterator(); ++it) {
            if (it->is_directory()) {
                string name = it->path().filename().string();
                if (name == ".vcs" || name == ".git" || name == "build" || name == "client" || name == "node_modules") {
                    it.disable_recursion_pending();
                    continue;
                }
            } else if (it->is_regular_file()) {
                string path = normalizePath(it->path().string());
                ifstream file(path, ios::binary);
                if (file) {
                    string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
                    wtFiles[path] = Storage::computeHash(content);
                    allPaths.insert(path);
                }
            }
        }
    } catch (...) {}

    for (const string& path : allPaths) {
        bool inHead = headFiles.count(path);
        bool inIndex = stagingArea.count(path);
        bool inWt = wtFiles.count(path);

        string headHash = inHead ? headFiles[path] : "";
        StageOperation indexOp = StageOperation::OP_MODIFY;
        string indexHash = "";
        if (inIndex) {
            indexOp = stagingArea[path].operation;
            indexHash = stagingArea[path].hash;
        }
        string wtHash = inWt ? wtFiles[path] : "";

        if (inIndex) {
            FileChange c; c.filename = path;
            if (indexOp == StageOperation::OP_ADD) {
                c.status = "added"; c.oldHash = ""; c.newHash = indexHash;
            } else if (indexOp == StageOperation::OP_MODIFY) {
                c.status = "modified"; c.oldHash = headHash; c.newHash = indexHash;
            } else if (indexOp == StageOperation::OP_DELETE) {
                c.status = "deleted"; c.oldHash = headHash; c.newHash = "";
            }
            status.staged.push_back(c);
        }

        if (!inHead && !inIndex && inWt) {
            status.untracked.push_back(path);
        } else {
            if (inHead || (inIndex && indexOp != StageOperation::OP_DELETE)) {
                status.tracked.push_back(path);
            }

            string currentExpectedHash = inIndex ? (indexOp == StageOperation::OP_DELETE ? "" : indexHash) : headHash;
            bool expectExists = !currentExpectedHash.empty();

            if (expectExists && inWt && wtHash != currentExpectedHash) {
                FileChange c; c.filename = path; c.status = "modified";
                c.oldHash = currentExpectedHash; c.newHash = wtHash;
                status.unstaged.push_back(c);
            } else if (expectExists && !inWt) {
                FileChange c; c.filename = path; c.status = "deleted";
                c.oldHash = currentExpectedHash; c.newHash = "";
                status.unstaged.push_back(c);
            }
        }
    }

    std::sort(status.tracked.begin(), status.tracked.end());
    status.tracked.erase(std::unique(status.tracked.begin(), status.tracked.end()), status.tracked.end());

    return status;
}

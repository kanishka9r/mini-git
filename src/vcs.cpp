#include <iostream>
#include <fstream>
#include <set>
#include <direct.h>
#include <sys/stat.h>
#include <fstream>
#include <time.h>
#include "vcs.h"
#include "storage.h"

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

    ofstream headFile(".vcs/HEAD");
    headFile << "ref: refs/main";
    headFile.close();

    cout << "Initialized empty VCS repository!" << endl;
}

void VCS::add(const string &filename)
{
    ifstream file(filename);
    if(!file){
        cout << "File not found!" << endl;
        return;
    }

    string content, line;
    while(getline(file, line)){
        content += line + "\n";
    }

    const string hash = Storage::computeHash(content);
    
    Storage::storeObject(content);

    stagingArea[filename] = hash;

    cout << "Added " + filename + " to staging" << endl;

}

void VCS::commit(const string& message)
{
    if(stagingArea.empty()){
        cout << "Nothing to commit" << endl;
        return;
    }

    string parentHash = "";
    ifstream refFile(".vcs/refs/main");

    if(refFile){
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

    for(auto it : stagingArea){
        commitFile << it.first << ":" << it.second << endl;
    }

    commitFile.close();

    ofstream refUpdate(".vcs/refs/main");
    refUpdate << commitHash;
    refUpdate.close();

    stagingArea.clear();

    cout << "Committed as " << commitHash << endl;
}

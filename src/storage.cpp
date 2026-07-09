#include "storage.h"
#include <fstream>
#include <unordered_map>
#include <sys/stat.h>

using namespace std;

// Generate hash from content

string Storage::computeHash(const string &content)
{
    // Create hash object
    // Immediately call it with content
    hash<string> f;
    size_t h = f(content);

     return to_string(h);
}

// Store object only if not exists
void Storage::storeObject(const string &content)
{
    string hash = computeHash(content);
    string path = ".vcs/objects/" + hash;

    struct stat st;

    // Deduplication check
    if (stat(path.c_str(), &st) == 0)
    {
        return; // already exists
    }

    ofstream file(path, ios::binary);
    file << content;
    file.close();
}

// Retrieve object by hash
string Storage::getObject(const string &hash)
{
    string path = ".vcs/objects/" + hash;

    ifstream file(path, ios::binary);
    if (!file) return "";
    string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());

    file.close();
    return content;
}


// Read the index and return the staging area map
unordered_map<string, StageEntry> Storage::readIndex()
{
    unordered_map<string, StageEntry> stagingArea;

    ifstream index(".vcs/index");
    string line;

    while (getline(index, line))
    {
        int pos1 = line.find(":");
        if (pos1 == string::npos) continue;

        string filename = line.substr(0, pos1);
        string remainder = line.substr(pos1 + 1);

        int pos2 = remainder.find(":");
        StageOperation op = StageOperation::OP_MODIFY;
        string hash = "";

        if (pos2 == string::npos) {
            // Old format migration (filename:hash or filename:)
            hash = remainder;
            if (hash.empty()) op = StageOperation::OP_DELETE;
        } else {
            // New format (filename:OP:hash)
            string opStr = remainder.substr(0, pos2);
            hash = remainder.substr(pos2 + 1);

            if (opStr == "ADD") op = StageOperation::OP_ADD;
            else if (opStr == "DELETE") op = StageOperation::OP_DELETE;
            else op = StageOperation::OP_MODIFY;
        }

        stagingArea[filename] = {op, hash};
    }

    return stagingArea;
}

void Storage::writeIndex(const unordered_map<string, StageEntry>& stagingArea)
{
    ofstream index(".vcs/index", ios::trunc);
    for (const auto& p : stagingArea)
    {
        string opStr = "MODIFY";
        if (p.second.operation == StageOperation::OP_ADD) opStr = "ADD";
        else if (p.second.operation == StageOperation::OP_DELETE) opStr = "DELETE";

        index << p.first << ":" << opStr << ":" << p.second.hash << "\n";
    }
    index.close();
}

// Clears the index file
void Storage::clearIndex()
{
    ofstream clear(".vcs/index");
}

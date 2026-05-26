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

    ofstream file(path);
    file << content;
    file.close();
}

// Retrieve object by hash
string Storage::getObject(const string &hash)
{
    string path = ".vcs/objects/" + hash;

    ifstream file(path);
    string content, line;

    while (getline(file, line))
    {
        content += line + "\n";
    }

    file.close();
    return content;
}


// Read the index and return the staging area map
unordered_map<string, string> Storage::readIndex()
{
    unordered_map<string, string> stagingArea;

    ifstream index(".vcs/index");
    string line;

    while (getline(index, line))
    {
        int pos = line.find(":");

        string filename = line.substr(0, pos);
        string hash = line.substr(pos + 1);

        stagingArea[filename] = hash;
    }

    return stagingArea;
}

// Clears the index file
void Storage::clearIndex()
{
    ofstream clear(".vcs/index");
}

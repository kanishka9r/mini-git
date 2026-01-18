#include "storage.h"
#include <fstream>
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

/*
Store object only if not exists
*/
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

/*
Retrieve object by hash
*/
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

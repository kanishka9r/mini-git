#ifndef STORAGE_H
#define STORAGE_H

#include <string>

using namespace std;

class Storage
{
public:
    // generate hash for content
    static string computeHash(const string &content);

    // store object using hash
    static void storeObject(const string &content);

    // retrieve stored object
    static string getObject(const string &hash);
};

#endif

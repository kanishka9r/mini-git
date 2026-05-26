#pragma once

#include <string>
#include <unordered_map>

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

    static unordered_map<string, string> readIndex();

    static void clearIndex();
};


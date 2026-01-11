#ifndef STORAGE_H
#define STORAGE_H

#include <string>

using namespace std;

// generate hash for content
string computeHash(string content);

// store object using hash
void storeObject(string hash, string content);

// retrieve stored object
string getObject(string hash);

#endif
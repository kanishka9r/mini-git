#include "diff.h"

#include <iostream>
#include <fstream>
#include <vector>
#include <string>

using namespace std;

void Diff::run(
    const string& file1,
    const string& file2
)
{

    ifstream f1(file1);
    ifstream f2(file2);

    if (!f1 || !f2)
    {
        cout << "Could not open files\n";
        return;
    }

    vector<string> lines1;
    vector<string> lines2;

    string line;

    while (getline(f1, line))
    {
        lines1.push_back(line);
    }

    while (getline(f2, line))
    {
        lines2.push_back(line);
    }

    cout << "File 1 lines: " << lines1.size() << endl;
    cout << "File 2 lines: " << lines2.size() << endl;
}
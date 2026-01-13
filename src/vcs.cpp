#include <iostream>
#include <direct.h>
#include <sys/stat.h>
#include <fstream>
#include "../include/vcs.h"

using namespace std;

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
    _mkdir(".vcs/refs");

    ofstream headFile(".vcs/HEAD");
    headFile << "ref: refs/main";
    headFile.close();

    cout << "Initialized empty VCS repository!" << endl;
}

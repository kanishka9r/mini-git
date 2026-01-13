#include <iostream>
#include "..\include\vcs.h"
using namespace std;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cout << "No command provided\n";
        return 0;
    }

    string cmd = argv[1];

    if (cmd == "init") {
        // will call VCS::init()
        if (argc > 2)
        {
            cout << "init does not take arguments\n";
            return 0;
        }

        VCS vcs;
        vcs.init();
    }
    else if (cmd == "add") {
        // will call VCS::add()
    }
    else if (cmd == "commit") {
        // will call VCS::commit()
    }
    else if (cmd == "branch") {
        // will call VCS::branch()
    }
    else if (cmd == "checkout") {
        // will call VCS::checkout()
    }
    else if (cmd == "log") {
        // will call VCS::log()
    }
    else if (cmd == "diff") {
        // will call Diff::run()
    }
    else if (cmd == "merge") {
        // will call Merge::run()
    }
    else {
        cout << "Unknown command\n";
    }

    return 0;
}

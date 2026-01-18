#include <iostream>
#include "storage.h"
#include "vcs.h"
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
        VCS::init();
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
    if (argc == 3 && string(argv[2]) == "--graph")
        VCS::logGraph();
    else
        VCS::log();
}
    else if (cmd == "diff") {
        // will call Diff::run()
    }
    else if (cmd == "merge") {
        // will call Merge::run()
    }
    else if (cmd == "cat-object") {
    if (argc != 3) {
        cout << "Usage: cat-object <hash>\n";
        return 0;
    }
    cout << Storage::getObject(argv[2]) << endl;
}

    else {
        cout << "Unknown command\n";
    }

    return 0;
}

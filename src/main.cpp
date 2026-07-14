#include <iostream>
#include <cstdlib>
#include "storage.h"
#include "vcs.h"
#include "diff.h"
#include "branch.h"
#include "commit.h"
#include "api_server.h"

using namespace std;

int main(int argc, char* argv[]) {

    //  Server Mode: serve argument  start REST API 
    if (argc >= 2 && string(argv[1]) == "serve") {
        int port = 8080;
        if (argc >= 3) {
            port = atoi(argv[2]);
            if (port <= 0) port = 8080;
        }
        ApiServer::start(port);
        return 0;
    }

    //  GUI Mode no arguments  start API server + open browser 
    if (argc < 2) {
        cout << "Starting Mini-Git...\n";
        cout << "Opening http://localhost:8080 in your browser\n";
        
#ifdef _WIN32
        system("start http://localhost:8080");
#elif __APPLE__
        system("open http://localhost:8080");
#else
        system("xdg-open http://localhost:8080 &");
#endif

        ApiServer::start(8080);
        return 0;
    }

    //  CLI Mode existing command-line interface
    string cmd = argv[1];

    // will call VCS::init()
    if (cmd == "init") {
        if (argc > 2)
        {
            cout << "init does not take arguments\n";
            return 0;
        }
        VCS::init();
    }

    // will call VCS::add()
    else if (cmd == "add") {
        if (argc != 3) {
            cout << "Usage: vcs add <file>\n";
            return 0;
        }
        VCS::add(argv[2]);
    }

    else if (cmd == "unstage") {
        if (argc != 3) {
            cout << "Usage: vcs unstage <file>\n";
            return 0;
        }
        VCS::unstage(argv[2]);
    }

    else if (cmd == "untrack") {
        if (argc != 3) {
            cout << "Usage: vcs untrack <file>\n";
            return 0;
        }
        VCS::untrack(argv[2]);
    }

    // will call VCS::commit
    else if (cmd == "commit") {
        if (argc < 3) {
            cout << "Usage: vcs commit <message>\n";
            return 0;
        }
        string message = argv[2];
        for (int i = 3; i < argc; i++) {
            message += " ";
            message += argv[i];
        }
        VCS::commit(message);
    }

    // will call VCS::branch()
    else if (cmd == "branch") {
        if (argc != 3)
        {
            cout << "Usage: vcs branch <name>\n";
            return 0;
        }
        VCS::branch(argv[2]);
    }

    // will call VCS::checkout
    else if (cmd == "checkout") {
        if (argc != 3) {
        cout << "Usage: vcs checkout <branch>\n";
        return 0;
    }
    VCS::checkout(argv[2]);
    }

    // will call VCS::log
    else if (cmd == "log") {
    if (argc == 3 && string(argv[2]) == "--graph")
        VCS::logGraph();
    else
        VCS::log();
}  
 
    // will call Diff::run()
    else if (cmd == "diff") {
         if (argc != 4) {
        cout << "Usage: vcs diff <file1> <file2>\n";
        return 0;
    }
    Diff::run(argv[2], argv[3]);
    }
    
    // will call Storage::getObject
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

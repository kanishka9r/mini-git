#pragma once

#include <string>

class ApiServer {
public:
    // Start the REST API server on the given port
    static void start(int port = 8080);
};

#pragma once

#include <string>

class ApiServer
{
public:
    // Start the REST API server on the given port
    // Blocks the calling thread (runs the event loop)
    static void start(int port = 8080);
};

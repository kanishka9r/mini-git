#pragma once

#include <string>

class Diff
{
public:
    static void run(
        const std::string& file1,
        const std::string& file2
    );
};
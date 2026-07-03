#pragma once

#include <string>
#include <vector>

struct DiffLine {
    char type;         // '+' added, '-' removed, ' ' unchanged
    std::string text;
};

class Diff
{
public:
    static void run(
        const std::string& file1,
        const std::string& file2
    );
    static std::vector<DiffLine> compute(
        const std::string& content1,
        const std::string& content2
    );
};
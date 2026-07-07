#pragma once

#include <string>
#include <vector>

// Represents a single line in a diff output
struct DiffLine {
    char type;         // '+' added, '-' removed, ' ' unchanged
    std::string text;
};

class Diff
{
public:
    // Existing CLI method 
    static void run(
        const std::string& file1,
        const std::string& file2
    );

    // New GUI-facing method compute diff from content strings
    static std::vector<DiffLine> compute(
        const std::string& content1,
        const std::string& content2
    );
};
#include "api_server.h"
#include "httplib.h"
#include "vcs.h"
#include "storage.h"
#include "commit.h"
#include "branch.h"
#include "diff.h"
#include "config_manager.h"

#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/stat.h>
#include <direct.h>

using namespace std;

// --- Simple JSON helpers (no external JSON library needed) ---------

static string jsonEscape(const string &s)
{
    string out;
    for (char c : s)
    {
        switch (c)
        {
        case '"':
            out += "\\\"";
            break;
        case '\\':
            out += "\\\\";
            break;
        case '\n':
            out += "\\n";
            break;
        case '\r':
            out += "\\r";
            break;
        case '\t':
            out += "\\t";
            break;
        default:
            out += c;
        }
    }
    return out;
}

static string jsonUnescape(const string &s)
{
    string out;
    for (size_t i = 0; i < s.size(); ++i)
    {
        if (s[i] == '\\' && i + 1 < s.size())
        {
            char next = s[++i];
            switch (next)
            {
            case '"':
                out += '"';
                break;
            case '\\':
                out += '\\';
                break;
            case 'n':
                out += '\n';
                break;
            case 'r':
                out += '\r';
                break;
            case 't':
                out += '\t';
                break;
            default:
                out += next;
                break;
            }
        }
        else
        {
            out += s[i];
        }
    }
    return out;
}

static bool directoryExists(const string &path)
{
    struct stat st;
    return stat(path.c_str(), &st) == 0 && (st.st_mode & S_IFDIR);
}

// Parse a simple JSON object string into key-value pairs
// Supports: { "key": "value", "key2": "value2" }
static unordered_map<string, string> parseJson(const string &body)
{
    unordered_map<string, string> result;
    size_t i = 0;

    while (i < body.size())
    {
        // Find key
        size_t keyStart = body.find('"', i);
        if (keyStart == string::npos)
            break;
        size_t keyEnd = body.find('"', keyStart + 1);
        if (keyEnd == string::npos)
            break;

        string key = body.substr(keyStart + 1, keyEnd - keyStart - 1);

        // Find colon
        size_t colon = body.find(':', keyEnd + 1);
        if (colon == string::npos)
            break;

        // Find value - skip whitespace
        size_t valStart = colon + 1;
        while (valStart < body.size() && (body[valStart] == ' ' || body[valStart] == '\t'))
            valStart++;

        if (valStart >= body.size())
            break;

        string value;

        if (body[valStart] == '"')
        {
            // String value
            size_t valEnd = body.find('"', valStart + 1);
            if (valEnd == string::npos)
                break;
            value = jsonUnescape(body.substr(valStart + 1, valEnd - valStart - 1));
            i = valEnd + 1;
        }
        else if (body[valStart] == '[')
        {
            // Array value - find matching bracket
            int depth = 1;
            size_t pos = valStart + 1;
            while (pos < body.size() && depth > 0)
            {
                if (body[pos] == '[')
                    depth++;
                else if (body[pos] == ']')
                    depth--;
                pos++;
            }
            value = body.substr(valStart, pos - valStart);
            i = pos;
        }
        else if (body[valStart] == 't' || body[valStart] == 'f')
        {
            // Boolean
            if (body.substr(valStart, 4) == "true")
            {
                value = "true";
                i = valStart + 4;
            }
            else
            {
                value = "false";
                i = valStart + 5;
            }
        }
        else
        {
            // Number or other
            size_t valEnd = body.find_first_of(",}", valStart);
            if (valEnd == string::npos)
                valEnd = body.size();
            value = body.substr(valStart, valEnd - valStart);
            // Trim whitespace
            while (!value.empty() && (value.back() == ' ' || value.back() == '\n' || value.back() == '\r'))
                value.pop_back();
            i = valEnd;
        }

        result[key] = value;
    }

    return result;
}

// Parse a JSON array of strings: ["file1.txt", "file2.txt"]
static vector<string> parseJsonStringArray(const string &arr)
{
    vector<string> result;
    size_t i = 0;

    while (i < arr.size())
    {
        size_t start = arr.find('"', i);
        if (start == string::npos)
            break;
        size_t end = arr.find('"', start + 1);
        if (end == string::npos)
            break;

        result.push_back(arr.substr(start + 1, end - start - 1));
        i = end + 1;
    }

    return result;
}
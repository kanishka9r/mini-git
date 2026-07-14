#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

static string jsonUnescape(const string& s)
{
    string out;
    for (size_t i = 0; i < s.size(); ++i)
    {
        if (s[i] == '\\' && i + 1 < s.size())
        {
            char next = s[++i];
            switch (next)
            {
                case '"': out += '"'; break;
                case '\\': out += '\\'; break;
                case 'n': out += '\n'; break;
                case 'r': out += '\r'; break;
                case 't': out += '\t'; break;
                default: out += next; break;
            }
        }
        else
        {
            out += s[i];
        }
    }
    return out;
}

static unordered_map<string, string> parseJson(const string& body)
{
    unordered_map<string, string> result;
    size_t i = 0;

    while (i < body.size())
    {
        // Find key
        size_t keyStart = body.find('"', i);
        if (keyStart == string::npos) break;
        size_t keyEnd = body.find('"', keyStart + 1);
        if (keyEnd == string::npos) break;

        string key = body.substr(keyStart + 1, keyEnd - keyStart - 1);

        // Find colon
        size_t colon = body.find(':', keyEnd + 1);
        if (colon == string::npos) break;

        // Find value skip whitespace
        size_t valStart = colon + 1;
        while (valStart < body.size() && (body[valStart] == ' ' || body[valStart] == '\t'))
            valStart++;

        if (valStart >= body.size()) break;

        string value;

        if (body[valStart] == '"')
        {
            // String value
            size_t valEnd = valStart + 1;
            while (valEnd < body.size()) {
                if (body[valEnd] == '"' && body[valEnd-1] != '\\') {
                    break;
                }
                valEnd++;
            }
            if (valEnd >= body.size()) break;
            value = jsonUnescape(body.substr(valStart + 1, valEnd - valStart - 1));
            i = valEnd + 1;
        }
        result[key] = value;
    }
    return result;
}

int main() {
    string json = "{\"path\":\"b.txt\",\"content\":\"pull feature\\n\"}";
    auto params = parseJson(json);
    cout << "parsed content: " << params["content"] << endl;
    
    // api server does this:
    string content = jsonUnescape(params["content"]);
    cout << "api server double unescaped content: " << content << endl;
    return 0;
}

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

#include <filesystem>

using namespace std;
namespace fs = std::filesystem;

//  Simple JSON helpers (no external JSON library needed) 

static string jsonEscape(const string& s)
{
    string out;
    for (char c : s)
    {
        switch (c)
        {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            default:   out += c;
        }
    }
    return out;
}

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

static bool directoryExists(const string& path)
{
    struct stat st;
    return stat(path.c_str(), &st) == 0 && (st.st_mode & S_IFDIR);
}

// Parse a simple JSON object string into key-value pairs
// Supports: { "key": "value", "key2": "value2" }
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
        else if (body[valStart] == '[')
        {
            // Array value find matching bracket
            int depth = 1;
            size_t pos = valStart + 1;
            while (pos < body.size() && depth > 0)
            {
                if (body[pos] == '[') depth++;
                else if (body[pos] == ']') depth--;
                pos++;
            }
            value = body.substr(valStart, pos - valStart);
            i = pos;
        }
        else if (body[valStart] == '{')
        {
            // Object value find matching bracket
            int depth = 1;
            size_t pos = valStart + 1;
            while (pos < body.size() && depth > 0)
            {
                if (body[pos] == '{') depth++;
                else if (body[pos] == '}') depth--;
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
            if (valEnd == string::npos) valEnd = body.size();
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
static vector<string> parseJsonStringArray(const string& arr)
{
    vector<string> result;
    size_t i = 0;

    while (i < arr.size())
    {
        size_t start = arr.find('"', i);
        if (start == string::npos) break;
        size_t end = arr.find('"', start + 1);
        if (end == string::npos) break;

        result.push_back(arr.substr(start + 1, end - start - 1));
        i = end + 1;
    }

    return result;
}

//  API server implementation 

void ApiServer::start(int port)
{
    httplib::Server svr;

    //  cors middleware 
    svr.set_pre_routing_handler([](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return httplib::Server::HandlerResponse::Unhandled;
    });

    // Handle preflight options requests
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status = 204;
    });

    // Serve the static React frontend from client/dist
    svr.set_mount_point("/", "./client/dist");

    //  POST /api/workspace 
    svr.Post("/api/workspace", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("path") == params.end() || params["path"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing workspace path\"}", "application/json");
            return;
        }

        string path = params["path"];
        
        try
        {
            if (directoryExists(path))
            {
                fs::current_path(path);
                res.set_content("{\"success\":true,\"message\":\"Workspace changed\"}", "application/json");
            }
            else
            {
                res.status = 400;
                res.set_content("{\"success\":false,\"message\":\"Path does not exist or is not a directory\"}", "application/json");
            }
        }
        catch (const std::exception& e)
        {
            res.status = 500;
            res.set_content("{\"success\":false,\"message\":\"" + jsonEscape(e.what()) + "\"}", "application/json");
        }
    });

    //  GET /api/status 
    svr.Get("/api/status", [](const httplib::Request&, httplib::Response& res) {
        bool init = VCS::isInitialized();
        string branch = init ? Branch::getCurrentBranch() : "";
        string head = init ? Branch::getHeadCommit() : "";

        string json = "{";
        json += "\"initialized\":" + string(init ? "true" : "false") + ",";
        json += "\"branch\":\"" + jsonEscape(branch) + "\",";
        json += "\"headCommit\":\"" + jsonEscape(head) + "\"";
        json += "}";

        res.set_content(json, "application/json");
    });

    // GET /api/branches
    svr.Get("/api/branches", [](const httplib::Request&, httplib::Response& res) {
        if (!VCS::isInitialized()) {
            res.set_content("{\"current\":\"\", \"branches\":[]}", "application/json");
            return;
        }

        string current = Branch::getCurrentBranch();
        vector<string> branches = Branch::getAllBranches();

        string json = "{";
        json += "\"current\":\"" + jsonEscape(current) + "\",";
        json += "\"branches\":[";
        for (size_t i = 0; i < branches.size(); ++i) {
            json += "\"" + jsonEscape(branches[i]) + "\"";
            if (i < branches.size() - 1) json += ",";
        }
        json += "]";
        json += "}";

        res.set_content(json, "application/json");
    });

    //  POST /api/init 
    svr.Post("/api/init", [](const httplib::Request&, httplib::Response& res) {
        if (VCS::isInitialized())
        {
            res.set_content("{\"success\":false,\"message\":\"Repository already initialized!\"}", "application/json");
            return;
        }

        VCS::init();
        res.set_content("{\"success\":true,\"message\":\"Initialized empty VCS repository!\"}", "application/json");
    });

    //  POST /api/add 
    svr.Post("/api/add", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("files") == params.end())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing 'files' array\"}", "application/json");
            return;
        }

        vector<string> files = parseJsonStringArray(params["files"]);

        if (files.empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"No files specified\"}", "application/json");
            return;
        }

        VCS::addMultiple(files);

        res.set_content("{\"success\":true,\"staged\":" + to_string(files.size()) + "}", "application/json");
    });

    //  POST /api/commit 
    svr.Post("/api/commit", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("message") == params.end() || params["message"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing commit message\"}", "application/json");
            return;
        }

        string hash = VCS::commitAndReturnHash(params["message"]);

        if (hash.empty())
        {
            res.set_content("{\"success\":false,\"message\":\"Nothing to commit (staging area empty)\"}", "application/json");
            return;
        }

        res.set_content("{\"success\":true,\"hash\":\"" + jsonEscape(hash) + "\"}", "application/json");
    });

    svr.Get("/api/staging-status", [](const httplib::Request& req, httplib::Response& res) {
        try {
            StagingStatus status = VCS::getStagingStatus();
            string json = "{";
            
            json += "\"staged\":[";
            for (size_t i = 0; i < status.staged.size(); ++i) {
                const auto& c = status.staged[i];
                json += "{\"filename\":\"" + jsonEscape(c.filename) + "\",";
                json += "\"status\":\"" + c.status + "\",";
                json += "\"oldHash\":\"" + jsonEscape(c.oldHash) + "\",";
                json += "\"newHash\":\"" + jsonEscape(c.newHash) + "\"}";
                if (i < status.staged.size() - 1) json += ",";
            }
            json += "],";
            
            json += "\"unstaged\":[";
            for (size_t i = 0; i < status.unstaged.size(); ++i) {
                const auto& c = status.unstaged[i];
                json += "{\"filename\":\"" + jsonEscape(c.filename) + "\",";
                json += "\"status\":\"" + c.status + "\",";
                json += "\"oldHash\":\"" + jsonEscape(c.oldHash) + "\",";
                json += "\"newHash\":\"" + jsonEscape(c.newHash) + "\"}";
                if (i < status.unstaged.size() - 1) json += ",";
            }
            json += "],";
            
            json += "\"untracked\":[";
            for (size_t i = 0; i < status.untracked.size(); ++i) {
                json += "\"" + jsonEscape(status.untracked[i]) + "\"";
                if (i < status.untracked.size() - 1) json += ",";
            }
            json += "],";
            
            json += "\"tracked\":[";
            for (size_t i = 0; i < status.tracked.size(); ++i) {
                json += "\"" + jsonEscape(status.tracked[i]) + "\"";
                if (i < status.tracked.size() - 1) json += ",";
            }
            json += "]";
            
            json += "}";
            
            res.set_content(json, "application/json");
        } catch (const exception& e) {
            res.status = 500;
            res.set_content("{\"error\":\"" + jsonEscape(e.what()) + "\"}", "application/json");
        }
    });

    //  GET /api/log 
    svr.Get("/api/log", [](const httplib::Request&, httplib::Response& res) {
        vector<Commit> history = VCS::getCommitHistory();

        string json = "[";
        for (size_t i = 0; i < history.size(); i++)
        {
            const Commit& c = history[i];

            json += "{";
            json += "\"hash\":\"" + jsonEscape(c.hash) + "\",";
            json += "\"parentHash\":\"" + jsonEscape(c.parentHash) + "\",";
            json += "\"message\":\"" + jsonEscape(c.message) + "\",";
            json += "\"timestamp\":" + to_string(c.timestamp) + ",";

            // Files object
            json += "\"files\":{";
            bool first = true;
            for (const auto& f : c.files)
            {
                if (!first) json += ",";
                json += "\"" + jsonEscape(f.first) + "\":\"" + jsonEscape(f.second) + "\"";
                first = false;
            }
            json += "},";

            json += "\"fileCount\":" + to_string(c.files.size());
            json += "}";

            if (i < history.size() - 1) json += ",";
        }
        json += "]";

        res.set_content(json, "application/json");
    });

    //  GET /api/changes 
    svr.Get("/api/changes", [](const httplib::Request&, httplib::Response& res) {
        vector<FileChange> changes = VCS::getModifiedFiles();

        string json = "[";
        for (size_t i = 0; i < changes.size(); i++)
        {
            const FileChange& c = changes[i];
            json += "{";
            json += "\"filename\":\"" + jsonEscape(c.filename) + "\",";
            json += "\"status\":\"" + jsonEscape(c.status) + "\",";
            json += "\"oldHash\":\"" + jsonEscape(c.oldHash) + "\",";
            json += "\"newHash\":\"" + jsonEscape(c.newHash) + "\"";
            json += "}";
            if (i < changes.size() - 1) json += ",";
        }
        json += "]";

        res.set_content(json, "application/json");
    });

    //  POST /api/diff 
    svr.Post("/api/diff", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        string oldContent;
        string newContent;

        // Get old content from object store
        if (params.find("oldHash") != params.end() && !params["oldHash"].empty())
        {
            oldContent = Storage::getObject(params["oldHash"]);
        }

        // Get new content either from request body, from hash, or from file
        if (params.find("newContent") != params.end())
        {
            newContent = params["newContent"];
        }
        else if (params.find("newHash") != params.end() && !params["newHash"].empty())
        {
            newContent = Storage::getObject(params["newHash"]);
        }
        else if (params.find("filename") != params.end())
        {
            ifstream file(params["filename"], ios::binary);
            if (file)
            {
                newContent = string((istreambuf_iterator<char>(file)),
                                     istreambuf_iterator<char>());
            }
        }

        vector<DiffLine> diff = Diff::compute(oldContent, newContent);

        string json = "[";
        for (size_t i = 0; i < diff.size(); i++)
        {
            json += "{\"type\":\"";
            json += diff[i].type;
            json += "\",\"text\":\"" + jsonEscape(diff[i].text) + "\"}";
            if (i < diff.size() - 1) json += ",";
        }
        json += "]";

        res.set_content(json, "application/json");
    });

    //  POST /api/branch 
    svr.Post("/api/branch", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("name") == params.end() || params["name"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing branch name\"}", "application/json");
            return;
        }

        try {
            VCS::branch(params["name"]);
            res.set_content("{\"success\":true}", "application/json");
        } catch (const exception& e) {
            res.status = 500;
            res.set_content("{\"success\":false,\"message\":\"" + jsonEscape(string(e.what())) + "\"}", "application/json");
        }
    });

    //  POST /api/checkout 
    svr.Post("/api/checkout", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("name") == params.end() || params["name"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing branch name\"}", "application/json");
            return;
        }

        try {
            VCS::checkout(params["name"]);
            res.set_content("{\"success\":true}", "application/json");
        } catch (const exception& e) {
            res.status = 500;
            res.set_content("{\"success\":false,\"message\":\"" + jsonEscape(string(e.what())) + "\"}", "application/json");
        }
    });

    //  POST /api/unstage 
    svr.Post("/api/unstage", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("filename") == params.end() || params["filename"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing filename\"}", "application/json");
            return;
        }

        VCS::unstage(params["filename"]);
        res.set_content("{\"success\":true}", "application/json");
    });

    //  POST /api/untrack 
    svr.Post("/api/untrack", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("filename") == params.end() || params["filename"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing filename\"}", "application/json");
            return;
        }

        VCS::untrack(params["filename"]);
        res.set_content("{\"success\":true}", "application/json");
    });

    //  GET /api/config 
    svr.Get("/api/config", [](const httplib::Request&, httplib::Response& res) {
        string token = ConfigManager::loadToken();
        string username = ConfigManager::get("username");
        RemoteInfo remote = ConfigManager::loadRemote();

        string json = "{";
        json += "\"token\":\"" + jsonEscape(token) + "\",";
        json += "\"username\":\"" + jsonEscape(username) + "\",";
        json += "\"remote_owner\":\"" + jsonEscape(remote.owner) + "\",";
        json += "\"remote_repo\":\"" + jsonEscape(remote.repo) + "\",";
        json += "\"remote_url\":\"" + jsonEscape(remote.url) + "\"";
        json += "}";

        res.set_content(json, "application/json");
    });

    //  POST /api/config 
    svr.Post("/api/config", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("key") != params.end() && params.find("value") != params.end())
        {
            ConfigManager::set(params["key"], params["value"]);
        }

        // Also support batch config for remote
        if (params.find("remote_owner") != params.end())
        {
            ConfigManager::saveRemote(
                params["remote_owner"],
                params["remote_repo"],
                params["remote_url"]
            );
        }

        res.set_content("{\"success\":true}", "application/json");
    });

    //  GET /api/object/:hash 
    svr.Get("/api/object/:hash", [](const httplib::Request& req, httplib::Response& res) {
        string hash = req.path_params.at("hash");
        string content = Storage::getObject(hash);

        string json = "{\"content\":\"" + jsonEscape(content) + "\"}";
        res.set_content(json, "application/json");
    });

    //  POST /api/revert 
    svr.Post("/api/revert", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("commitHash") == params.end() || params["commitHash"].empty())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing commitHash\"}", "application/json");
            return;
        }

        string targetHash = params["commitHash"];

        try
        {
            // Load the target commit
            Commit target = Commit::getCommit(targetHash);

            // Clean working directory
            string currentHead = Branch::getHeadCommit();
            if (!currentHead.empty()) {
                Commit headCommit = Commit::getCommit(currentHead);
                VCS::cleanWorkingDirectory(headCommit.files, target.files);
            }

            // Restore all files from the target commit's snapshot
            vector<string> filenames;
            for (const auto& pair : target.files)
            {
                string content = Storage::getObject(pair.second);
                
                fs::path p(pair.first);
                if (p.has_parent_path()) {
                    fs::create_directories(p.parent_path());
                }

                ofstream out(pair.first, ios::binary);
                out << content;
                out.close();
                filenames.push_back(pair.first);
            }

            // Stage all restored files
            VCS::addMultiple(filenames);

            // Create revert commit
            string shortHash = targetHash.substr(0, 8);
            string revertMsg = "Revert to commit " + shortHash;
            string newHash = VCS::commitAndReturnHash(revertMsg);

            if (newHash.empty())
            {
                res.set_content("{\"success\":true,\"newHash\":\"\","
                    "\"message\":\"Files restored (no changes to commit)\"}", "application/json");
            }
            else
            {
                res.set_content("{\"success\":true,\"newHash\":\"" + jsonEscape(newHash) +
                    "\",\"message\":\"" + jsonEscape(revertMsg) + "\"}", "application/json");
            }
        }
        catch (const exception& e)
        {
            res.status = 500;
            res.set_content("{\"success\":false,\"message\":\"" +
                jsonEscape(string(e.what())) + "\"}", "application/json");
        }
    });

    // ─── POST /api/pull-file ─────────────────────────────────────────
    svr.Post("/api/pull-file", [](const httplib::Request& req, httplib::Response& res) {
        auto params = parseJson(req.body);

        if (params.find("path") == params.end() || params.find("content") == params.end())
        {
            res.status = 400;
            res.set_content("{\"success\":false,\"message\":\"Missing path or content\"}", "application/json");
            return;
        }

        string path = params["path"];
        string content = jsonUnescape(params["content"]);

        bool isConflict = false;

        ifstream inFile(path, ios::binary);
        if (inFile)
        {
            string localContent((istreambuf_iterator<char>(inFile)), istreambuf_iterator<char>());
            inFile.close();

            if (localContent != content)
            {
                string currentHead = Branch::getHeadCommit();
                string headContent = "";
                if (!currentHead.empty())
                {
                    Commit headCommit = Commit::getCommit(currentHead);
                    if (headCommit.files.find(path) != headCommit.files.end())
                    {
                        headContent = Storage::getObject(headCommit.files[path]);
                    }
                }

                if (localContent != headContent)
                {
                    // User has edited it locally! Conflict!
                    isConflict = true;
                }
            }
        }

        if (isConflict)
        {
            string remotePath = path + ".remote";
            string localPath = path + ".local";

            // Rename local file
            if (fs::exists(localPath)) fs::remove(localPath);
            fs::rename(path, localPath);

            // Save remote file
            ofstream outRemote(remotePath, ios::binary);
            outRemote << content;
            outRemote.close();

            res.status = 409;
            res.set_content("{\"success\":false,\"conflict\":true,\"message\":\"Conflict in " + jsonEscape(path) + "\"}", "application/json");
        }
        else
        {
            // No local edits, just overwrite with GitHub's version!
            fs::path p(path);
            if (p.has_parent_path()) {
                fs::create_directories(p.parent_path());
            }

            ofstream out(path, ios::binary);
            out << content;
            out.close();

            res.set_content("{\"success\":true,\"message\":\"Pulled " + jsonEscape(path) + "\"}", "application/json");
        }
    });

    // ─── Start server ────────────────────────────────────────────────
    cout << "\n";
    cout << "  ------------------------------------------\n";
    cout << "  |   Mini-Git API Server                  |\n";
    cout << "  |   http://localhost:" << port << "               |\n";
    cout << "  |   Press Ctrl+C to stop                 |\n";
    cout << "  ------------------------------------------\n";
    cout << "\n";

    svr.listen("0.0.0.0", port);
}


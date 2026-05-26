#include "graph.h"
#include "commit.h"
#include <queue>

using namespace std;

// helper DFS
void Graph::dfsAncestors(const string& commit, unordered_set<string>& visited)
{
    for (const string& parent : getParents(commit))
    {
        if (visited.find(parent) == visited.end())
        {
            visited.insert(parent);
            dfsAncestors(parent, visited);
        }
    }
}

unordered_set<string> Graph::getAncestors(const string& commitHash)
{
    unordered_set<string> visited;
    dfsAncestors(commitHash, visited);
    return visited;
}

vector<string> Graph::bfsTraversal(const string& start)
{
    vector<string> order;
    unordered_set<string> visited;
    queue<string> q;

    q.push(start);
    visited.insert(start);

    while (!q.empty())
    {
        string current = q.front();
        q.pop();

        for (const string& parent : getParents(current))
        {
            if (visited.find(parent) == visited.end())
            {
                visited.insert(parent);
                order.push_back(parent);
                q.push(parent);
            }
        }
    }

    return order;
}

vector<string> Graph::getParents(const string &hash)
{
    Commit c = Commit::getCommit(hash);

    vector<string> parents;
    if (!c.parentHash.empty())
    {
        parents.push_back(c.parentHash);
    }

    return parents;
}

#include "diff.h"
#include <algorithm>
#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <sstream>

using namespace std;

void Diff::run(
    const string& file1,
    const string& file2
)
{

    ifstream f1(file1);
    ifstream f2(file2);

    if (!f1 || !f2)
    {
        cout << "Could not open files\n";
        return;
    }

    vector<string> lines1;
    vector<string> lines2;

    string line;

    while (getline(f1, line))
    {
        lines1.push_back(line);
    }

    while (getline(f2, line))
    {
        lines2.push_back(line);
    }

    int prefixCount = 0;
    while (prefixCount < lines1.size() && prefixCount < lines2.size() && 
           lines1[prefixCount] == lines2[prefixCount]) {
        prefixCount++;
    }

    int suffixCount = 0;
    while (suffixCount < (lines1.size() - prefixCount) && 
           suffixCount < (lines2.size() - prefixCount) && 
           lines1[lines1.size() - 1 - suffixCount] == lines2[lines2.size() - 1 - suffixCount]) {
        suffixCount++;
    }

    int n = lines1.size() - prefixCount - suffixCount;
    int m = lines2.size() - prefixCount - suffixCount;

    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));

    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            if (lines1[prefixCount + i - 1] == lines2[prefixCount + j - 1])
            {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            }
            else
            {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    int totalLcs = prefixCount + suffixCount + dp[n][m];
    cout << "LCS Length = "<< totalLcs << endl;
    vector<string> diffOutput;

    int i = n;
    int j = m;

    while (i > 0 && j > 0)
    {
        if (lines1[prefixCount + i - 1] == lines2[prefixCount + j - 1])
        {
            i--;
            j--;
        }
        else if (dp[i - 1][j] > dp[i][j - 1])
        {
            diffOutput.push_back("- " + lines1[prefixCount + i - 1]);
            i--;
        }
        else
        {
            diffOutput.push_back("+ " + lines2[prefixCount + j - 1]);
            j--;
        }
    }
    
    while (i > 0)
    {
        diffOutput.push_back("- " + lines1[prefixCount + i - 1]);
        i--;
    }

    while (j > 0)
    {
        diffOutput.push_back("+ " + lines2[prefixCount + j - 1]);
        j--;
    }

    reverse(diffOutput.begin(), diffOutput.end());

    for (const string& line : diffOutput)
    {
        cout << line << endl;
    }
}

//  GUI-facing compute diff from content strings 

vector<DiffLine> Diff::compute(const string& content1, const string& content2)
{
    vector<DiffLine> result;

    // Split content into lines
    vector<string> lines1, lines2;
    istringstream s1(content1), s2(content2);
    string line;

    while (getline(s1, line))
        lines1.push_back(line);
    while (getline(s2, line))
        lines2.push_back(line);

    int prefixCount = 0;
    while (prefixCount < lines1.size() && prefixCount < lines2.size() && 
           lines1[prefixCount] == lines2[prefixCount]) {
        prefixCount++;
    }

    int suffixCount = 0;
    while (suffixCount < (lines1.size() - prefixCount) && 
           suffixCount < (lines2.size() - prefixCount) && 
           lines1[lines1.size() - 1 - suffixCount] == lines2[lines2.size() - 1 - suffixCount]) {
        suffixCount++;
    }

    int n = lines1.size() - prefixCount - suffixCount;
    int m = lines2.size() - prefixCount - suffixCount;

    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));

    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            if (lines1[prefixCount + i - 1] == lines2[prefixCount + j - 1])
                dp[i][j] = 1 + dp[i - 1][j - 1];
            else
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    vector<DiffLine> diffOutput;
    
    // 1. Push suffix in reverse
    for (int k = 0; k < suffixCount; k++) {
        diffOutput.push_back({' ', lines1[lines1.size() - 1 - k]});
    }

    // 2. Backtrack middle
    int i = n, j = m;
    while (i > 0 && j > 0)
    {
        if (lines1[prefixCount + i - 1] == lines2[prefixCount + j - 1])
        {
            diffOutput.push_back({' ', lines1[prefixCount + i - 1]});
            i--; j--;
        }
        else if (dp[i - 1][j] > dp[i][j - 1])
        {
            diffOutput.push_back({'-', lines1[prefixCount + i - 1]});
            i--;
        }
        else
        {
            diffOutput.push_back({'+', lines2[prefixCount + j - 1]});
            j--;
        }
    }

    while (i > 0)
    {
        diffOutput.push_back({'-', lines1[prefixCount + i - 1]});
        i--;
    }

    while (j > 0)
    {
        diffOutput.push_back({'+', lines2[prefixCount + j - 1]});
        j--;
    }
    
    // 3. Push prefix in reverse
    for (int k = prefixCount - 1; k >= 0; k--) {
        diffOutput.push_back({' ', lines1[k]});
    }

    reverse(diffOutput.begin(), diffOutput.end());
    return diffOutput;
}

#include "diff.h"
#include <algorithm>
#include <iostream>
#include <fstream>
#include <vector>
#include <string>

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

    int n = lines1.size();
    int m = lines2.size();

    vector<vector<int>> dp(
    n + 1,
    vector<int>(m + 1, 0)
    );

   for (int i = 1; i <= n; i++)
   {
      for (int j = 1; j <= m; j++)
       {
        // same line
        if (lines1[i - 1] == lines2[j - 1])
        {
            dp[i][j] =
                1 + dp[i - 1][j - 1];
        }

        // different lines
        else
        {
            dp[i][j] = max(
                dp[i - 1][j],
                dp[i][j - 1]
            );
        }
        }
    }
    cout << "LCS Length = "<< dp[n][m]<< endl;
    vector<string> diffOutput;

int i = n;
int j = m;

while (i > 0 && j > 0)
{
    // same line
    if (lines1[i - 1] == lines2[j - 1])
    {
        i--;
        j--;
    }

    // line removed
    else if (dp[i - 1][j] > dp[i][j - 1])
    {
        diffOutput.push_back(
            "- " + lines1[i - 1]
        );

        i--;
    }

    // line added
    else
    {
        diffOutput.push_back(
            "+ " + lines2[j - 1]
        );

        j--;
    }
}
// remaining old lines
while (i > 0)
{
    diffOutput.push_back(
        "- " + lines1[i - 1]
    );

    i--;
}

// remaining new lines
while (j > 0)
{
    diffOutput.push_back(
        "+ " + lines2[j - 1]
    );

    j--;
}

reverse(
    diffOutput.begin(),
    diffOutput.end()
);

for (const string& line : diffOutput)
{
    cout << line << endl;
}


}
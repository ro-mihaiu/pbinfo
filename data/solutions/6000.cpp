#include <iostream>
#include <vector>
using namespace std;

vector<int> adj[1001];
bool viz[1001];

void dfs(int node) {
    viz[node] = true;
    for (int next : adj[node])
        if (!viz[next]) dfs(next);
}

int main() {
    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    dfs(1);
    cout << "Parcurgere finalizata\n";
    return 0;
}

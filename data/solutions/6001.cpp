#include <iostream>
#include <queue>
#include <vector>
using namespace std;

vector<int> adj[1001];
bool viz[1001];

void bfs(int start) {
    queue<int> q;
    q.push(start);
    viz[start] = true;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (int next : adj[node])
            if (!viz[next]) {
                viz[next] = true;
                q.push(next);
            }
    }
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
    bfs(1);
    cout << "Parcurgere finalizata\n";
    return 0;
}

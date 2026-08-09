#include <iostream>
using namespace std;

int main() {
    int n, cnt = 0;
    cin >> n;
    while (n > 0) {
        int d = n % 10;
        if (d % 2 == 1) cnt++;
        n /= 10;
    }
    cout << cnt << '\n';
    return 0;
}

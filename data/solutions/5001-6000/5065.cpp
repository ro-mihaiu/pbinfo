// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/5065.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.
#include <iostream>
#include <cmath>
using namespace std;

int main() {
    int n, k, x;
    cin >> n >> k;

    int cnt = 0;
    long long s = 0;

    for (int i = 1; i <= n; i++) {
        cin >> x;

        int r = sqrt(x);

        if (r * r == x) {
            cnt++;

            if (cnt <= k) {
                s += x;
            }
        }
    }

    cout << cnt << '\n';

    if (cnt >= k)
        cout << s;
    else
        cout << "imposibil";

    return 0;
}

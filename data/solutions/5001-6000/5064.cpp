// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/5064.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.
#include <iostream>
#include <cmath>
using namespace std;

int main() {
    int n, k, x;
    cin >> n >> k;

    int C = 0;
    long long S = 0;
    int rez = -1;

    for (int i = 1; i <= n; i++) {
        cin >> x;

        int r = sqrt(x);

        if (r * r == x) {
            S += x;
            C++;

            if (C == k) {
                rez = x;
            }
        }
    }

    cout << S << '\n';

    if (rez != -1)
        cout << rez;
    else
        cout << "nu exista";

    return 0;
}

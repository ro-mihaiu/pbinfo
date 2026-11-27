// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/5026.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.
#include <iostream>

using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;

    long long sum = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        sum += x;
    }

    cout << sum << "\n";

    return 0;
}
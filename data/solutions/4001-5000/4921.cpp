// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/4921.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.

#include <iostream>
using namespace std;

int main() {
    int n, s = 0;

    cin >> n;
    while (n != 0) {
        if (n >= 10 && n <= 99 && n / 10 == n % 10) {
            s += n;
        }
        cin >> n;
    }

    cout << s;
    return 0;
}
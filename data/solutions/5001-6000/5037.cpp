// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/5037.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.
#include <iostream>
using namespace std;

int main() {
    int n, x;
    cin >> n;

    bool gasit = false;

    for (int i = 0; i < n; i++) {
        cin >> x;

        if (x % 2 == 0) {
            cout << x;
            gasit = true;
            break;
        }
    }

    if (!gasit)
        cout << "IMPOSIBIL";

    return 0;
}
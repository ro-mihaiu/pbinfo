// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/5061.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.
#include <iostream>
using namespace std;

int main() {
    int x, C = 0, P = 1;

    cin >> x;

    while (x != 0) {
        if (x % 2 == 0)
            C++;

        if (x < 10)
            P *= x;

        cin >> x;
    }

    cout << C << " " << P;

    return 0;
}

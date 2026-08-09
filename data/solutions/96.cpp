#include <iostream>
#include <cmath>
using namespace std;

int main() {
    int n, r;
    cin >> n;
    r = (int)sqrt(n);
    if (r * r == n)
        cout << "da\n";
    else
        cout << "nu\n";
    return 0;
}

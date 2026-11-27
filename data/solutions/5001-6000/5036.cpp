// Source: https://github.com/itsiamdev/pbinfo/blob/f3b4da4fe218fe863a23a0c86ffbd80f63dd46fb/rezolvari%20pbinfo/5036.cpp
// MIT license: see data/sources/itsiamdev-LICENSE.txt
// Compiles with C++17; not verified by the PBInfo judge.
#include <iostream>

using namespace std;

int main()
{
    int n,x,s=0,cnt=0;
    cin>>n;
    for(int i=1;i<=n;i++){
        cin>>x;
        
        if(x%2==0){
            s+=x;
            cnt++;
        }
    }
    double M=(double) s/ cnt;
    cout<<M;
    return 0;
}
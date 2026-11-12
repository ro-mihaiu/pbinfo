#include <iostream>
#include <algorithm>
#include <cstring>
using namespace std;
int main()
{
    char s[101],v[101];
    int n=0;
    cin>>s;
    int m=strlen(s);
    for(int i=0;i<m;i++)
        if(strchr("aeiou",s[i]))
            v[n++]=s[i];
    sort(v,v+n,greater<char>());
    int k=0;
    for(int i=0;i<m;i++)
        if(strchr("aeiou",s[i]))
            s[i]=v[k++];
    cout<<s;
    return 0;
}

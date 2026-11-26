#include <bits/stdc++.h>
using namespace std;
int main() {
    char s[256],scuv[101][16],*p;
    int i,j,n=0;
    cin.getline(s,256);
    p=strtok(s," ");
    while(p) {
        bool ok=1;
        for(i=0; p[i]; i++)
            for(j=i+1; p[j]; j++)
                if(p[i]==p[j])
                    ok=0;
        if(ok)
            strcpy(scuv[++n],p);
        p=strtok(0," ");
    }
    if(n==0)
        cout<<"nu exista";
    else {
        for(i=1; i<n; i++)
            for(j=i+1; j<=n; j++)
                if(strcmp(scuv[i],scuv[j])>0)
                    swap(scuv[i],scuv[j]);
        for(i=1; i<=n; i++)
            cout<<scuv[i]<<'\n';
    }
    return 0;
}

#include <bits/stdc++.h>
using namespace std;
bool pal(char p[],int st,int dr) {
	int i,j;
	for(i=st,j=dr; i<j; i++,j--)
		if(p[i]!=p[j])
			return 0;
	return 1;
}
int main() {
	char s[101],a[101],t[101];
	int i,j,k,lgm=-1;
	cin>>s;
	for(i=0; s[i]; i++)
		for(j=i; s[j]; j++)
			if(pal(s,i,j)) {
				strcpy(t,s+i);
				t[j-i+1]=0;
				if(lgm<j-i+1) {
					lgm=j-i+1;
					strcpy(a,t);
				}
				else if(j-i+1==lgm)
				    if(strcmp(t,a)<0)
				        strcpy(a,t);
			}
	cout<<a;
	return 0;
}

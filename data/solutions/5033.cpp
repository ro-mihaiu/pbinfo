int cmmmc(int a,int b){
    int i;
    for(i=a;i<=a*b;i++)
        if(i%a==0&&i%b==0)
            return i;
    return 0;
}
int depozit(int x, int y, int z){
    int c1=cmmmc(x,y);
    int c2=cmmmc(c1,z);
    return c2;
}
int pagini(int n){
    if(n%4!=0)
        return 0;
    int p=n/4;
    if(p<2)
        return 0;
    for(int d=2;d*d<=p;d++)
        if(p%d==0)
            return 0;
    return 1;
}

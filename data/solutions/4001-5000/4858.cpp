int diviz(int n){
    int i;
    for(i=sqrt(n);i>=1;i--)
        if(n%(i*i)==0)
            return i*i;
    return 1;
}
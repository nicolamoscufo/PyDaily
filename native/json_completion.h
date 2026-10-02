#pragma once
#include <string>

// La grammatica verifica il JSON; questo stato riconosce soltanto la fine dell'oggetto.
struct JsonCompletion {
    int depth=0;
    bool quoted=false,escaped=false,done=false;
    void append(const std::string &text,size_t start){
        for(size_t i=start;i<text.size()&&!done;i++){
            const char c=text[i];
            if(quoted){
                if(escaped)escaped=false;
                else if(c=='\\')escaped=true;
                else if(c=='"')quoted=false;
            }else if(c=='"')quoted=true;
            else if(c=='{')depth++;
            else if(c=='}'&&--depth==0)done=true;
        }
    }
};

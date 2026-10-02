#pragma once
#include "llama.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

inline llama_token_data_array pydaily_grammar_candidates(std::vector<llama_token_data> & storage,const float * logits,llama_sampler * shortlist,llama_sampler * grammar) {
    if(!logits||storage.empty())throw std::runtime_error("Il modello non ha prodotto risultati utilizzabili.");
    for(size_t i=0;i<storage.size();i++){
        if(std::isnan(logits[i])||logits[i]==INFINITY)throw std::runtime_error("Il modello ha prodotto valori numerici non validi. Prova un altro GGUF.");
    }
    const auto reset=[&](){
        for(size_t i=0;i<storage.size();i++)storage[i]={(llama_token)i,logits[i],0.0f};
        return llama_token_data_array{storage.data(),storage.size(),-1,false};
    };
    const auto has_candidate=[](const llama_token_data_array & choices){
        return std::any_of(choices.data,choices.data+choices.size,[](const llama_token_data & token){return std::isfinite(token.logit);});
    };
    auto choices=reset();
    if(!has_candidate(choices))throw std::runtime_error("Il modello non ha prodotto risultati utilizzabili.");
    llama_sampler_apply(shortlist,&choices);
    llama_sampler_apply(grammar,&choices);
    if(!has_candidate(choices)){
        choices=reset();
        llama_sampler_apply(grammar,&choices);
    }
    if(!has_candidate(choices))throw std::runtime_error("Il modello non ha token compatibili con il formato richiesto. Prova un altro GGUF.");
    // Grammar masks change logits: the shortlist order is no longer valid.
    choices.sorted=false;
    return choices;
}

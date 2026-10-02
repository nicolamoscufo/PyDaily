#include "../native/llama.cpp/src/llama-model.h"
#include "../native/tutor_policy.h"
#include "../native/tutor_sampling.h"
#include <cassert>
#include <cmath>
#include <iostream>
#include <limits>
#include <memory>
#include <vector>

static bool grammar_allows(const llama_vocab * vocab,const char * syntax,const std::string & text){
    std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> grammar(llama_sampler_init_grammar(vocab,syntax,"root"),llama_sampler_free);assert(grammar);
    for(size_t i=0;i<=text.size();i++){
        llama_token token=llama_vocab_eos(vocab);
        if(i<text.size()){
            token=-1;
            for(llama_token id=0;id<llama_vocab_n_tokens(vocab);id++){
                char piece[16];const int length=llama_token_to_piece(vocab,id,piece,sizeof(piece),0,false);
                if(length==1&&piece[0]==text[i]){token=id;break;}
            }
            assert(token>=0);
        }
        llama_token_data data{token,0,0};llama_token_data_array choices{&data,1,-1,false};
        llama_sampler_apply(grammar.get(),&choices);
        if(!std::isfinite(data.logit))return false;
        llama_sampler_accept(grammar.get(),token);
    }
    return true;
}
static void test_json_whitespace(const llama_vocab * vocab){
    const std::string exercise=R"({"title":"t","function":"f","params":["x"],"description":"x     e intero.","solution":"def f(x):\n    return x*2","cases":[{"args":[1],"expected":2},{"args":[0],"expected":0},{"args":[-1],"expected":-2},{"args":[2],"expected":4}],"tips":["a","b"],"study":"s"})";
    const std::string hint=R"({"hint":"controlla x.","focus":"return"})";
    for(const auto & entry:std::vector<std::pair<const char *,std::string>>{{pydaily_exercise_grammar,exercise},{pydaily_hint_grammar,hint}}){
        assert(grammar_allows(vocab,entry.first,entry.second));
        auto pretty=entry.second;pretty.insert(1,"\n   ");assert(grammar_allows(vocab,entry.first,pretty));
        auto excessive=entry.second;excessive.insert(1,"     ");assert(!grammar_allows(vocab,entry.first,excessive));
        excessive=entry.second;excessive.insert(excessive.find(','),"     ");assert(!grammar_allows(vocab,entry.first,excessive));
    }
    for(const auto & change:std::vector<std::pair<std::string,std::string>>{{"\"function\":\"f\"","\"function\":\"f f\""},{"\"function\":\"f\"","\"function\":\""+std::string(32,'f')+"\""},{"\"params\":[\"x\"]","\"params\":[]"},{"\"params\":[\"x\"]","\"params\":[\"x y\"]"},{"\"params\":[\"x\"]","\"params\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\"]"}}){
        auto invalid=exercise;invalid.replace(invalid.find(change.first),change.first.size(),change.second);assert(!grammar_allows(vocab,pydaily_exercise_grammar,invalid));
    }
    std::cout<<"BOUNDED_JSON_OK: complete exercise and hint, compact/pretty JSON, escaped code, bounded whitespace and signature names\n";
}

static void test_sampling(const llama_vocab * vocab){
    const size_t count=llama_vocab_n_tokens(vocab);
    std::vector<float> logits(count);for(size_t i=0;i<count;i++)logits[i]=float(count-i);
    std::vector<llama_token_data> storage(count);
    using Sampler=std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)>;
    for(const char * syntax:{"root ::= \"z\"","root ::= [a-z]"})for(int k:{32,4}){
        Sampler shortlist(llama_sampler_init_top_k(k),llama_sampler_free);
        Sampler chain(llama_sampler_chain_init(llama_sampler_chain_default_params()),llama_sampler_free);
        auto * grammar=llama_sampler_init_grammar(vocab,syntax,"root");assert(grammar);
        llama_sampler_chain_add(chain.get(),grammar);
        llama_sampler_chain_add(chain.get(),llama_sampler_init_top_k(40));
        llama_sampler_chain_add(chain.get(),llama_sampler_init_top_p(0.92f,1));
        llama_sampler_chain_add(chain.get(),llama_sampler_init_temp(0.35f));
        llama_sampler_chain_add(chain.get(),llama_sampler_init_dist(42));
        if(k==32){
            for(size_t i=0;i<count;i++)storage[i]={(llama_token)i,logits[i],0.0f};
            llama_token_data_array legacy{storage.data(),storage.size(),-1,false};
            llama_sampler_apply(shortlist.get(),&legacy);llama_sampler_apply(grammar,&legacy);
            assert(legacy.sorted&&!std::isfinite(legacy.data[0].logit));
            assert(std::any_of(legacy.data,legacy.data+legacy.size,[](const llama_token_data & t){return std::isfinite(t.logit);}));
        }
        auto choices=pydaily_grammar_candidates(storage,logits.data(),shortlist.get(),grammar);assert(!choices.sorted);
        llama_sampler_apply(chain.get(),&choices);
        assert(choices.selected>=0&&choices.selected<(int64_t)choices.size);
        if(std::string(syntax)=="root ::= \"z\"")assert(choices.data[choices.selected].id==28); // z in the synthetic vocabulary
        else assert(choices.data[choices.selected].id>=3&&choices.data[choices.selected].id<=28);
        assert(std::isfinite(choices.data[choices.selected].logit)&&choices.data[choices.selected].p>0);
        for(size_t i=0;i<choices.size;i++)assert(std::isfinite(choices.data[i].p));
    }
    Sampler shortlist(llama_sampler_init_top_k(4),llama_sampler_free);
    Sampler impossible(llama_sampler_init_grammar(vocab,"root ::= \"!\"","root"),llama_sampler_free);assert(impossible);
    bool rejected=false;try{pydaily_grammar_candidates(storage,logits.data(),shortlist.get(),impossible.get());}catch(const std::runtime_error &){rejected=true;}assert(rejected);
    for(float invalid:{std::numeric_limits<float>::quiet_NaN(),INFINITY,-INFINITY}){
        auto bad=logits;if(invalid==-INFINITY)std::fill(bad.begin(),bad.end(),invalid);else bad[0]=invalid;
        rejected=false;try{pydaily_grammar_candidates(storage,bad.data(),shortlist.get(),impossible.get());}catch(const std::runtime_error &){rejected=true;}assert(rejected);
    }
    std::cout<<"GRAMMAR_SAMPLING_OK: stale shortlist order, rare-token fallback, incompatible vocabulary and non-finite logits\n";
}

int main(int argc,char **argv){
    assert(argc==4);
    llama_backend_init();
    auto mp=llama_model_default_params();mp.n_gpu_layers=0;
    llama_model *model=llama_model_load_from_file(argv[1],mp);
    assert(model);
    assert(model->hparams.n_expert==0);
    assert(model->hparams.n_no_rope_layer_step>model->hparams.n_layer());
    assert(model->hparams.use_kq_norm);
    auto cp=llama_context_default_params();cp.n_ctx=256;cp.n_batch=8;cp.n_ubatch=8;cp.n_threads=2;cp.n_threads_batch=2;
    llama_context *ctx=llama_init_from_model(model,cp);assert(ctx);
    llama_token tokens[]={1,4,5};auto batch=llama_batch_get_one(tokens,3);
    assert(llama_decode(ctx,batch)==0);
    const float *logits=llama_get_logits_ith(ctx,-1);assert(logits);
    for(int i=0;i<llama_vocab_n_tokens(llama_model_get_vocab(model));i++)assert(std::isfinite(logits[i]));
    llama_sampler *grammar=llama_sampler_init_grammar(llama_model_get_vocab(model),pydaily_hint_grammar,"root");assert(grammar);
    test_json_whitespace(llama_model_get_vocab(model));
    test_sampling(llama_model_get_vocab(model));
    llama_sampler_free(grammar);llama_free(ctx);llama_model_free(model);
    model=llama_model_load_from_file(argv[2],mp);assert(!model);
    model=llama_model_load_from_file(argv[3],mp);assert(model);
    assert(model->hparams.n_expert==2);
    assert(model->hparams.n_no_rope_layer_step==4);
    assert(model->hparams.f_attn_temp_scale==0.1f);
    ctx=llama_init_from_model(model,cp);assert(ctx);
    assert(llama_decode(ctx,batch)==0);
    logits=llama_get_logits_ith(ctx,-1);assert(logits);
    for(int i=0;i<llama_vocab_n_tokens(llama_model_get_vocab(model));i++)assert(std::isfinite(logits[i]));
    llama_free(ctx);llama_model_free(model);
    llama_backend_free();
    std::cout<<"DENSE_LOADER_OK: synthetic dense and MoE decode, all-layer RoPE and QK norm, hint grammar, invalid MoE rejected\n";
}

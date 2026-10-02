#include <jni.h>
#include "llama.h"
#include <atomic>
#include <mutex>
#include <string>
#include <vector>
#include <memory>
#include <stdexcept>
#include <thread>
#include <algorithm>
#include <chrono>

static std::atomic<bool> cancelled(false);
static std::mutex inference_mutex;
static std::once_flag initialized;
static bool abort_compute(void *) { return cancelled.load(); }
static const char * grammar = R"GBNF(
root ::= "{" ws "\"title\"" ws ":" ws string "," ws "\"description\"" ws ":" ws string "," ws "\"function\"" ws ":" ws string "," ws "\"params\"" ws ":" ws params "," ws "\"solution\"" ws ":" ws string "," ws "\"cases\"" ws ":" ws "[" ws testcase "," ws testcase "," ws testcase "," ws testcase "]" ws "," ws "\"tips\"" ws ":" ws "[" ws string "," ws string "]" ws "," ws "\"study\"" ws ":" ws string "}" ws
params ::= "[" ws string ("," ws string){0,5} "]" ws
testcase ::= "{" ws "\"args\"" ws ":" ws array "," ws "\"expected\"" ws ":" ws value "}" ws
value ::= object | array | string | number | "true" ws | "false" ws | "null" ws
object ::= "{" ws (string ":" ws value ("," ws string ":" ws value)*)? "}" ws
array ::= "[" ws (value ("," ws value)*)? "]" ws
string ::= "\"" ([^"\\\x00-\x1F] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F]{4}))* "\"" ws
number ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [+-]? [0-9]+)? ws
ws ::= [ \t\n\r]*
)GBNF";

static std::string from_java(JNIEnv *env, jstring text) {
    const char * chars = env->GetStringUTFChars(text, nullptr);
    if (!chars) throw std::runtime_error("Testo non disponibile");
    std::string result(chars);
    env->ReleaseStringUTFChars(text, chars);
    return result;
}

extern "C" JNIEXPORT void JNICALL Java_it_pydaily_app_LocalTutor_cancelNative(JNIEnv *, jclass) {
    cancelled.store(true);
}

extern "C" JNIEXPORT jbyteArray JNICALL Java_it_pydaily_app_LocalTutor_inferNative(
        JNIEnv *env, jclass, jstring path_java, jstring system_java, jstring prompt_java, jint max_tokens) {
  std::lock_guard<std::mutex> lock(inference_mutex);
  cancelled.store(false);
  try {
    std::call_once(initialized, [](){ llama_backend_init(); });
    std::string path=from_java(env,path_java),system=from_java(env,system_java),user=from_java(env,prompt_java);
    auto mp=llama_model_default_params();
    mp.n_gpu_layers=0; mp.load_mode=LLAMA_LOAD_MODE_MMAP;
    std::unique_ptr<llama_model,decltype(&llama_model_free)> model(llama_model_load_from_file(path.c_str(),mp),llama_model_free);
    if(!model) throw std::runtime_error("Non riesco ad aprire questo GGUF. Verifica che sia un modello supportato e che il download sia completo.");
    if(cancelled.load()) throw std::runtime_error("Generazione interrotta.");
    const auto *vocab=llama_model_get_vocab(model.get());
    const char *templ=llama_model_chat_template(model.get(),nullptr);
    llama_chat_message messages[]={{"system",system.c_str()},{"user",user.c_str()}};
    std::vector<char> text(32768);
    int size=llama_chat_apply_template(templ,messages,2,true,text.data(),text.size());
    std::string formatted;
    if(size<0){formatted="<|im_start|>system\n"+system+"<|im_end|>\n<|im_start|>user\n"+user+"<|im_end|>\n<|im_start|>assistant\n";}
    else {if(size>(int)text.size()){text.resize(size+1);size=llama_chat_apply_template(templ,messages,2,true,text.data(),text.size());}formatted.assign(text.data(),size);}
    int n=-llama_tokenize(vocab,formatted.c_str(),formatted.size(),nullptr,0,true,true);
    if(n<=0 || n>2200) throw std::runtime_error("La richiesta è troppo lunga. Prova una sfida più breve.");
    std::vector<llama_token> tokens(n);
    if(llama_tokenize(vocab,formatted.c_str(),formatted.size(),tokens.data(),tokens.size(),true,true)<0)throw std::runtime_error("Impossibile preparare la richiesta.");
    auto cp=llama_context_default_params();cp.n_ctx=4096;cp.n_batch=256;cp.n_ubatch=128;
    cp.n_threads=std::max(1,std::min(4,(int)std::thread::hardware_concurrency()));cp.n_threads_batch=cp.n_threads;cp.no_perf=true;
    std::unique_ptr<llama_context,decltype(&llama_free)> ctx(llama_init_from_model(model.get(),cp),llama_free);
    if(!ctx)throw std::runtime_error("Memoria insufficiente. Chiudi altre app o scegli il modello 1.5B.");
    llama_set_abort_callback(ctx.get(),abort_compute,nullptr);
    std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> sampler(llama_sampler_chain_init(llama_sampler_chain_default_params()),llama_sampler_free);
    auto * json_sampler=llama_sampler_init_grammar(vocab,grammar,"root");
    if(!json_sampler)throw std::runtime_error("Impossibile preparare il formato della sfida.");
    llama_sampler_chain_add(sampler.get(),json_sampler);
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_p(0.92f,1));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_temp(0.35f));
    const auto seed=(uint32_t)std::chrono::steady_clock::now().time_since_epoch().count();
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_dist(seed));
    for(int start=0;start<n;start+=256){
      if(cancelled.load())throw std::runtime_error("Generazione interrotta.");
      auto batch=llama_batch_get_one(tokens.data()+start,std::min(256,n-start));
      if(llama_decode(ctx.get(),batch)!=0)throw std::runtime_error(cancelled.load()?"Generazione interrotta.":"Impossibile elaborare la richiesta.");
    }
    std::string output;
    int limit=std::min({(int)max_tokens,1800,4096-n-1});
    bool finished=false;
    for(int i=0;i<limit;i++){
      if(cancelled.load())throw std::runtime_error("Generazione interrotta.");
      llama_token token=llama_sampler_sample(sampler.get(),ctx.get(),-1);
      if(llama_vocab_is_eog(vocab,token)){finished=true;break;}
      char buffer[256];int len=llama_token_to_piece(vocab,token,buffer,sizeof(buffer),0,true);
      if(len<0){std::vector<char> large(-len);len=llama_token_to_piece(vocab,token,large.data(),large.size(),0,true);if(len>0)output.append(large.data(),len);}
      else if(len>0)output.append(buffer,len);
      auto batch=llama_batch_get_one(&token,1);
      if(llama_decode(ctx.get(),batch)!=0)throw std::runtime_error(cancelled.load()?"Generazione interrotta.":"Generazione non riuscita.");
    }
    if(!finished)throw std::runtime_error("La sfida era troppo lunga. Riprova: chiederò un esercizio più compatto.");
    jbyteArray result=env->NewByteArray(output.size());
    if(result)env->SetByteArrayRegion(result,0,output.size(),reinterpret_cast<const jbyte*>(output.data()));
    return result;
  }catch(const std::exception &e){env->ThrowNew(env->FindClass("java/lang/RuntimeException"),e.what());return nullptr;}
}

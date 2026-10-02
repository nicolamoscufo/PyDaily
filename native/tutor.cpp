#include <jni.h>
#include "llama.h"
#include "json_completion.h"
#include "tutor_policy.h"
#include "tutor_sampling.h"
#include <atomic>
#include <mutex>
#include <string>
#include <vector>
#include <memory>
#include <stdexcept>
#include <thread>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#ifdef __ANDROID__
#include <android/log.h>
#include <sys/resource.h>
#endif

static std::atomic<bool> cancelled(false);
static std::mutex inference_mutex;
static std::once_flag initialized;
struct InferenceControl {
    int seconds=180;
    std::chrono::steady_clock::time_point start=std::chrono::steady_clock::now();
    bool expired() const { return std::chrono::steady_clock::now()-start>=std::chrono::seconds(seconds); }
    bool stopped() const { return cancelled.load() || expired(); }
    void check() const {
        if(cancelled.load())throw std::runtime_error("Generazione interrotta.");
        if(expired())throw std::runtime_error("Tempo massimo del tutor raggiunto. Riprova con una richiesta più compatta o un modello più piccolo.");
    }
};
static bool abort_compute(void *data) { return static_cast<InferenceControl *>(data)->stopped(); }
static bool load_progress(float,void *data) { return !static_cast<InferenceControl *>(data)->stopped(); }

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
extern "C" JNIEXPORT void JNICALL Java_it_pydaily_app_LocalTutor_prepareNative(JNIEnv *, jclass) {
    cancelled.store(false);
}

extern "C" JNIEXPORT jbyteArray JNICALL Java_it_pydaily_app_LocalTutor_inferNative(
        JNIEnv *env, jobject receiver, jstring id_java, jstring path_java, jstring system_java, jstring prompt_java, jint max_tokens, jboolean hint_request, jboolean fair_consent) {
  std::lock_guard<std::mutex> lock(inference_mutex);
  InferenceControl control;
  control.seconds=hint_request?60:180;
  try {
    control.check();
    jmethodID progress=env->GetMethodID(env->GetObjectClass(receiver),"inferenceProgress","(Ljava/lang/String;Ljava/lang/String;IJ)V");
    if(!progress)throw std::runtime_error("Le informazioni di avanzamento non sono disponibili.");
    auto report=[&](const char *phase,int tokens){
        jstring value=env->NewStringUTF(phase);
        const auto elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-control.start).count();
        env->CallVoidMethod(receiver,progress,id_java,value,(jint)tokens,(jlong)elapsed);
        env->DeleteLocalRef(value);
        if(env->ExceptionCheck())throw std::runtime_error("Impossibile aggiornare l'avanzamento del tutor.");
    };
    report("loading",0);
    std::call_once(initialized, [](){ llama_backend_init(); });
    std::string path=from_java(env,path_java),system=from_java(env,system_java),user=from_java(env,prompt_java);
    auto mp=llama_model_default_params();
    mp.n_gpu_layers=0; mp.load_mode=LLAMA_LOAD_MODE_MMAP;
    mp.progress_callback=load_progress;mp.progress_callback_user_data=&control;
    std::unique_ptr<llama_model,decltype(&llama_model_free)> model(llama_model_load_from_file(path.c_str(),mp),llama_model_free);
    control.check();
    if(!model) throw std::runtime_error("Non riesco ad aprire questo GGUF. Verifica che sia un modello supportato e che il download sia completo.");
    const auto loaded_at=std::chrono::steady_clock::now();
    const auto *vocab=llama_model_get_vocab(model.get());
    const char *templ=llama_model_chat_template(model.get(),nullptr);
    char architecture[128]={};llama_model_meta_val_str(model.get(),"general.architecture",architecture,sizeof(architecture));
    char license[128]={};llama_model_meta_val_str(model.get(),"general.license.name",license,sizeof(license));
    if(std::string(license)=="fair-noncommercial-research"&&!fair_consent)throw std::runtime_error("Accetta prima la licenza FAIR Noncommercial Research dal pannello MobileLLM.");
    const bool llama3_fallback=!templ&&std::string(architecture)=="llama4";
    if(llama3_fallback)templ="llama3";
    llama_chat_message messages[]={{"system",system.c_str()},{"user",user.c_str()}};
    std::vector<char> text(32768);
    int size=llama_chat_apply_template(templ,messages,2,true,text.data(),text.size());
    std::string formatted;
    if(size<0){formatted="<|im_start|>system\n"+system+"<|im_end|>\n<|im_start|>user\n"+user+"<|im_end|>\n<|im_start|>assistant\n";}
    else {if(size>(int)text.size()){text.resize(size+1);size=llama_chat_apply_template(templ,messages,2,true,text.data(),text.size());}formatted.assign(text.data(),size);}
    formatted=pydaily_finish_prompt(formatted,architecture,llama3_fallback&&!llama_vocab_get_add_bos(vocab));
    int n=-llama_tokenize(vocab,formatted.c_str(),formatted.size(),nullptr,0,true,true);
    if(n<=0 || n>2200) throw std::runtime_error("La richiesta è troppo lunga. Prova una sfida più breve.");
    std::vector<llama_token> tokens(n);
    if(llama_tokenize(vocab,formatted.c_str(),formatted.size(),tokens.data(),tokens.size(),true,true)<0)throw std::runtime_error("Impossibile preparare la richiesta.");
    auto cp=llama_context_default_params();cp.n_ctx=4096;cp.n_batch=256;cp.n_ubatch=128;
    cp.n_threads=std::max(1,std::min(4,(int)std::thread::hardware_concurrency()));cp.n_threads_batch=cp.n_threads;cp.no_perf=false;
    std::unique_ptr<llama_context,decltype(&llama_free)> ctx(llama_init_from_model(model.get(),cp),llama_free);
    control.check();
    if(!ctx)throw std::runtime_error("Memoria insufficiente. Chiudi altre app o scegli il modello 1.5B.");
    llama_set_abort_callback(ctx.get(),abort_compute,&control);
    auto sp=llama_sampler_chain_default_params();sp.no_perf=false;
    std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> sampler(llama_sampler_chain_init(sp),llama_sampler_free);
    std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> shortlist(llama_sampler_init_top_k(128),llama_sampler_free);
    auto * json_sampler=llama_sampler_init_grammar(vocab,hint_request?pydaily_hint_grammar:pydaily_exercise_grammar,"root");
    if(!json_sampler)throw std::runtime_error("Impossibile preparare il formato della sfida.");
    llama_sampler_chain_add(sampler.get(),json_sampler);
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_p(0.92f,1));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_temp(0.35f));
    const auto seed=(uint32_t)std::chrono::steady_clock::now().time_since_epoch().count();
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_dist(seed));
    report("prompt",0);
    for(int start=0;start<n;start+=256){
      control.check();
      auto batch=llama_batch_get_one(tokens.data()+start,std::min(256,n-start));
      if(llama_decode(ctx.get(),batch)!=0){control.check();throw std::runtime_error("Impossibile elaborare la richiesta.");}
      report("prompt",std::min(start+256,n));
    }
    std::string output;
    int generated_tokens=0;
    int limit=std::min({(int)max_tokens,1800,4096-n-1});
    bool finished=false;
    JsonCompletion completion;
    report("tokens",0);
    auto last_report=std::chrono::steady_clock::now();
    std::vector<llama_token_data> candidates(llama_vocab_n_tokens(vocab));
    for(int i=0;i<limit;i++){
      control.check();
      const float *logits=llama_get_logits_ith(ctx.get(),-1);
      auto choices=pydaily_grammar_candidates(candidates,logits,shortlist.get(),json_sampler);
      llama_sampler_apply(sampler.get(),&choices);
      if(choices.selected<0||choices.selected>=(int64_t)choices.size)throw std::runtime_error("Impossibile completare il formato della sfida.");
      llama_token token=choices.data[choices.selected].id;
      generated_tokens++;
      llama_sampler_accept(sampler.get(),token);
      if(llama_vocab_is_eog(vocab,token)){finished=completion.done;break;}
      const size_t previous=output.size();
      char buffer[256];int len=llama_token_to_piece(vocab,token,buffer,sizeof(buffer),0,true);
      if(len<0){std::vector<char> large(-len);len=llama_token_to_piece(vocab,token,large.data(),large.size(),0,true);if(len>0)output.append(large.data(),len);}
      else if(len>0)output.append(buffer,len);
      completion.append(output,previous);
      if(completion.done){finished=true;break;}
      auto batch=llama_batch_get_one(&token,1);
      if(llama_decode(ctx.get(),batch)!=0){control.check();throw std::runtime_error("Generazione non riuscita.");}
      if(std::chrono::steady_clock::now()-last_report>=std::chrono::seconds(1)){
          report("tokens",i+1);last_report=std::chrono::steady_clock::now();
      }
    }
    control.check();
    if(!finished)throw std::runtime_error("La sfida era troppo lunga. Riprova: chiederò un esercizio più compatto.");
#ifdef __ANDROID__
    const auto perf=llama_perf_context(ctx.get());const auto sampling=llama_perf_sampler(sampler.get());
    __android_log_print(ANDROID_LOG_INFO,"PyDailyTutor","promptTokens=%d promptMs=%.0f outputTokens=%d decodeMs=%.0f samplingMs=%.0f",n,perf.t_p_eval_ms,perf.n_eval,perf.t_eval_ms,sampling.t_sample_ms);
    struct rusage usage{};getrusage(RUSAGE_SELF,&usage);
    char metrics[768];std::snprintf(metrics,sizeof(metrics),"{\"promptTokens\":%d,\"outputTokens\":%d,\"decodeTokens\":%d,\"loadMs\":%.0f,\"promptMs\":%.0f,\"decodeMs\":%.0f,\"samplingMs\":%.0f,\"peakProcessRssMiB\":%.1f,\"contextTokens\":4096,\"threads\":%d}",n,generated_tokens,perf.n_eval,std::chrono::duration<double,std::milli>(loaded_at-control.start).count(),perf.t_p_eval_ms,perf.t_eval_ms,sampling.t_sample_ms,usage.ru_maxrss/1024.0,cp.n_threads);
    jmethodID measured=env->GetMethodID(env->GetObjectClass(receiver),"inferenceMetrics","(Ljava/lang/String;Ljava/lang/String;)V");
    if(measured){jstring value=env->NewStringUTF(metrics);env->CallVoidMethod(receiver,measured,id_java,value);env->DeleteLocalRef(value);}
#endif
    report("done",0);
    jbyteArray result=env->NewByteArray(output.size());
    if(result)env->SetByteArrayRegion(result,0,output.size(),reinterpret_cast<const jbyte*>(output.data()));
    return result;
  }catch(const std::exception &e){if(!env->ExceptionCheck())env->ThrowNew(env->FindClass("java/lang/RuntimeException"),e.what());return nullptr;}
}

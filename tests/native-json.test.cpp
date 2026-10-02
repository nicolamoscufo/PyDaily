#include "../native/json_completion.h"
#include "../native/tutor_policy.h"
#include <cassert>
#include <iostream>
#include <vector>

int main(){
    const std::string prefix="<|im_start|>assistant\n";
    assert(pydaily_finish_prompt(prefix,"qwen3")==prefix+"<think>\n\n</think>\n\n");
    assert(pydaily_finish_prompt(prefix,"qwen2")==prefix);
    assert(pydaily_finish_prompt(prefix,"llama4")==prefix);
    const std::string llama3="<|start_header_id|>assistant<|end_header_id|>\n\n",bos="<|begin_of_text|>";
    assert(pydaily_finish_prompt(llama3,"llama4",true)==bos+llama3);
    assert(pydaily_finish_prompt(bos+llama3,"llama4",true)==bos+llama3);
    assert(pydaily_finish_prompt(llama3,"llama4",false)==llama3);
    const std::vector<std::string> valid={"{}","{\"code\":\"def f(x): return {x: 1}\",\"cases\":[{\"args\":[[]],\"expected\":0}]}",R"({"text":"escaped quote: \" then brace } and backslash \\"})"};
    for(const auto &text:valid){
        for(size_t split=0;split<=text.size();split++){
            JsonCompletion state;std::string streamed=text.substr(0,split);state.append(streamed,0);
            assert(state.done==(split==text.size()));
            streamed+=text.substr(split);state.append(streamed,split);assert(state.done);
        }
    }
    for(const auto &text:std::vector<std::string>{"{","{\"text\":\"}\"","{\"nested\":{}"}){
        JsonCompletion state;state.append(text,0);assert(!state.done);
    }
    std::cout<<"JSON_COMPLETION_OK: chunk boundaries, escapes, braces inside strings, nested objects and incomplete output\n";
}

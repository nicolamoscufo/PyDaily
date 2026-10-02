#pragma once
#include <string>

inline constexpr const char *pydaily_exercise_grammar=R"GBNF(
root ::= "{" ws "\"title\"" ws ":" ws string "," ws "\"function\"" ws ":" ws identifier "," ws "\"params\"" ws ":" ws params "," ws "\"description\"" ws ":" ws string "," ws "\"solution\"" ws ":" ws string "," ws "\"cases\"" ws ":" ws "[" ws testcase "," ws testcase "," ws testcase "," ws testcase "]" ws "," ws "\"tips\"" ws ":" ws "[" ws string "," ws string "]" ws "," ws "\"study\"" ws ":" ws string "}" ws
identifier ::= "\"" [a-z] [a-z0-9_]{0,30} "\"" ws
params ::= "[" ws identifier ("," ws identifier){0,5} "]" ws
testcase ::= "{" ws "\"args\"" ws ":" ws array "," ws "\"expected\"" ws ":" ws value "}" ws
value ::= object | array | string | number | "true" ws | "false" ws | "null" ws
object ::= "{" ws (string ":" ws value ("," ws string ":" ws value)*)? "}" ws
array ::= "[" ws (value ("," ws value)*)? "]" ws
string ::= "\"" ([^"\\\x00-\x1F] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F]{4}))* "\"" ws
number ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [+-]? [0-9]+)? ws
ws ::= [ \t\n\r]{0,4}
)GBNF";

inline constexpr const char *pydaily_hint_grammar=R"GBNF(
root ::= "{" ws "\"hint\"" ws ":" ws string "," ws "\"focus\"" ws ":" ws focus "}" ws
focus ::= "\"" ("syntax" | "signature" | "return" | "conditions" | "iteration" | "collections" | "indexing" | "numpy" | "calculation" | "timeout" | "other") "\"" ws
string ::= "\"" ([^"\\\x00-\x1F] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F]{4})){1,360} "\"" ws
ws ::= [ \t\n\r]{0,4}
)GBNF";

inline std::string pydaily_finish_prompt(std::string prompt,const std::string & architecture,bool add_llama3_bos=false) {
    if(add_llama3_bos&&prompt.rfind("<|begin_of_text|>",0)!=0)prompt="<|begin_of_text|>"+prompt;
    if(architecture=="qwen3")prompt+="<think>\n\n</think>\n\n";
    return prompt;
}

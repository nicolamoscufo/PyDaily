param(
    [string]$Sdk = $env:ANDROID_HOME,
    [string]$Python = ".venv\Scripts\python.exe",
    [string]$DeviceSerial = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $Sdk) { $Sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$compiler = Join-Path $Sdk "ndk\28.1.13356709\toolchains\llvm\prebuilt\windows-x86_64\bin\clang++.exe"
$adb = Join-Path $Sdk "platform-tools\adb.exe"
$library = Get-ChildItem (Join-Path $root "app\.cxx\Debug") -Filter libllama.a -Recurse |
    Where-Object { $_.FullName -match "arm64-v8a" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $library) { throw "Esegui prima gradlew.bat assembleDebug." }
$build = Split-Path (Split-Path $library.FullName -Parent) -Parent
$output = Join-Path $env:LOCALAPPDATA ("Temp\opencode\pydaily-native-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $output | Out-Null
function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program ha restituito $LASTEXITCODE." }
}
Push-Location $root
try {
    Invoke-Checked $Python @("tools/make_native_fixture.py", $output)
    $flags = @("--target=aarch64-linux-android26", "-std=c++17", "-O1", "-static-libstdc++")
    Invoke-Checked $compiler ($flags + @("tests/native-json.test.cpp", "-o", "$output\json-test"))
    $includes = @("-I", "native/llama.cpp/include", "-I", "native/llama.cpp/ggml/include", "-I", "native/llama.cpp/src")
    $libraries = @($library.FullName, "$build\ggml\src\libggml.a", "$build\ggml\src\libggml-cpu.a", "$build\ggml\src\libggml-base.a")
    Invoke-Checked $compiler ($flags + $includes + @("tests/native-loader.test.cpp", "-Wl,--start-group") + $libraries + @("-Wl,--end-group", "-llog", "-landroid", "-ldl", "-lm", "-o", "$output\loader-test"))
    if ($DeviceSerial) {
        $prefix = "/data/local/tmp/pydaily-test-" + [guid]::NewGuid().ToString("N")
        $files = @("json-test", "loader-test", "dense.gguf", "invalid-moe.gguf", "moe.gguf")
        try {
            foreach ($file in $files) { Invoke-Checked $adb @("-s", $DeviceSerial, "push", "$output\$file", "$prefix-$file") }
            Invoke-Checked $adb @("-s", $DeviceSerial, "shell", "chmod", "700", "$prefix-json-test", "$prefix-loader-test")
            Invoke-Checked $adb @("-s", $DeviceSerial, "shell", "$prefix-json-test")
            Invoke-Checked $adb @("-s", $DeviceSerial, "shell", "$prefix-loader-test", "$prefix-dense.gguf", "$prefix-invalid-moe.gguf", "$prefix-moe.gguf")
        } finally {
            & $adb -s $DeviceSerial shell rm -f @($files | ForEach-Object { "$prefix-$_" })
        }
    } else { Write-Output "Compilazione ARM64 completata; aggiungi -DeviceSerial per eseguire i test sul telefono." }
    Write-Output "Artefatti sintetici locali: $output"
} finally { Pop-Location }

"""Build riproducibile senza Gradle; richiede SDK 35, ECJ e libreria JNI compilata."""
import subprocess, os, zipfile, shutil, xml.etree.ElementTree as ET
from pathlib import Path
PROJECT=Path(__file__).resolve().parents[1]
ROOT=PROJECT.parent
ENV=Path(os.environ.get('PYDAILY_BUILD_ENV',str(ROOT/'build-env')))
BT=ENV/'build-tools/android-15';JAR=ENV/'platform/android-35/android.jar'
OUT=ROOT/'deliverables';OUT.mkdir(exist_ok=True)
BUILD=ENV/'apk';BUILD.mkdir(exist_ok=True)
def run(*args):subprocess.run([str(a) for a in args],check=True)
for filename in ['unsigned.apk','aligned.apk','resources.zip']:(BUILD/filename).unlink(missing_ok=True)
run(BT/'aapt2','compile','--dir',PROJECT/'app/src/main/res','-o',BUILD/'resources.zip')
ET.register_namespace('android','http://schemas.android.com/apk/res/android')
manifest=ET.parse(PROJECT/'app/src/main/AndroidManifest.xml');manifest.getroot().set('package','it.pydaily.app');manifest.write(BUILD/'AndroidManifest.xml',encoding='utf-8',xml_declaration=True)
run(BT/'aapt2','link','-I',JAR,'--manifest',BUILD/'AndroidManifest.xml','-A',PROJECT/'app/src/main/assets',BUILD/'resources.zip','--java',BUILD/'gen','-o',BUILD/'unsigned.apk')
with zipfile.ZipFile(BUILD/'unsigned.apk') as z:assert 'AndroidManifest.xml' in z.namelist(),z.namelist()
sources=list((PROJECT/'app/src/main/java').rglob('*.java'))+list((BUILD/'gen').rglob('*.java'))
run('java','-jar',ENV/'ecj.jar','-source','8','-target','8','-nowarn','-bootclasspath',str(JAR)+os.pathsep+str(BT/'core-lambda-stubs.jar'),'-d',BUILD/'classes',*sources)
dex=BUILD/'dex';dex.mkdir(exist_ok=True)
run('java','-cp',BT/'lib/d8.jar','com.android.tools.r8.D8','--min-api','26','--lib',JAR,'--output',dex,*list((BUILD/'classes').rglob('*.class')))
native=ENV/'native-android/libpydaily_llm.so';stripped=BUILD/'libpydaily_llm.so';shutil.copy2(native,stripped)
strip=ENV/'android-ndk-r28b/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip';run(strip,'--strip-unneeded',stripped)
with zipfile.ZipFile(BUILD/'unsigned.apk','a') as z:
 for f in dex.glob('*.dex'):z.write(f,f.name,compress_type=zipfile.ZIP_DEFLATED)
 z.write(stripped,'lib/arm64-v8a/libpydaily_llm.so',compress_type=zipfile.ZIP_STORED)
with zipfile.ZipFile(BUILD/'unsigned.apk') as z:assert 'AndroidManifest.xml' in z.namelist(),z.namelist()
run(BT/'zipalign','-P','16','-f','4',BUILD/'unsigned.apk',BUILD/'aligned.apk')
key=PROJECT/'tools/development.jks'
if not key.exists():run('keytool','-genkeypair','-keystore',key,'-storepass','android','-keypass','android','-alias','pydaily','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=PyDaily Development,O=PyDaily,C=IT')
apk=OUT/'PyDaily-Android.apk'
run('java','-jar',BT/'lib/apksigner.jar','sign','--ks',key,'--ks-pass','pass:android','--ks-key-alias','pydaily','--out',apk,BUILD/'aligned.apk')
run('java','-jar',BT/'lib/apksigner.jar','verify','--verbose',apk)
run(BT/'zipalign','-c','-P','16','4',apk)
print('APK_READY',apk,apk.stat().st_size)

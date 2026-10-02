package it.pydaily.app;

import android.app.ActivityManager;
import android.content.Intent;
import android.net.Uri;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

final class LocalTutor {
    static {System.loadLibrary("pydaily_llm");}
    private static native byte[] inferNative(String path,String system,String prompt,int maxTokens);
    private static native void cancelNative();
    private final MainActivity activity;
    private final AtomicBoolean busy=new AtomicBoolean(false),cancelDownload=new AtomicBoolean(false);
    private volatile boolean downloading=false;
    private volatile int progress=0;
    private volatile String message="";
    private static final String[][] MODELS={
        {"Qwen2.5-Coder 3B · Q4_K_M","https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/b052da96e84324589544585e439f410ccae19904/qwen2.5-coder-3b-instruct-q4_k_m.gguf","coder-3b.gguf","724fb256bec1ff062b2f65e4569e871ad2e95ab2a3989723d1769c54294730b7","2104932800"},
        {"Qwen2.5-Coder 1.5B · Q4_K_M","https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/2ab9f8f42af02fc212effaef7c4850c885e965f4/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf","coder-1.5b.gguf","cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046","1117320768"}
    };
    LocalTutor(MainActivity a){activity=a;}
    private File models(){File f=new File(activity.getFilesDir(),"models");f.mkdirs();return f;}
    private File active(){String name=activity.getSharedPreferences("native",0).getString("modelFile","");return name.isEmpty()?null:new File(models(),name);}
    JSONObject status(){
        JSONObject result=new JSONObject();File file=active();
        ActivityManager.MemoryInfo memory=new ActivityManager.MemoryInfo();((ActivityManager)activity.getSystemService("activity")).getMemoryInfo(memory);
        try{return result.put("type","model-status").put("available",file!=null&&file.isFile()).put("model",activity.getSharedPreferences("native",0).getString("modelName","")).put("ramGB",Math.round(memory.totalMem/1073741824.0)).put("downloading",downloading).put("progress",progress).put("busy",busy.get()).put("message",message);}catch(Exception e){return result;}
    }
    private void notifyStatus(){activity.event(status());}
    void action(String action){
        if(action.equals("cancelDownload")){cancelDownload.set(true);return;}
        if(busy.get()){message="Aspetta la fine dell’operazione in corso.";notifyStatus();return;}
        if(action.equals("download3")){download(0);return;}
        if(action.equals("download1")){download(1);return;}
        if(action.equals("pick")){Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");activity.startActivityForResult(intent,MainActivity.PICK_MODEL);return;}
        if(action.equals("delete")){File file=active();if(file!=null&&!file.delete()){message="Non riesco a eliminare il modello.";notifyStatus();return;}activity.getSharedPreferences("native",0).edit().remove("modelFile").remove("modelName").apply();message="Modello rimosso. Esercizi e progressi sono ancora disponibili.";notifyStatus();}
    }
    private void download(int index){
        if(!busy.compareAndSet(false,true))return;
        cancelDownload.set(false);downloading=true;progress=0;message="Download del modello. Tieni aperta l’app.";notifyStatus();
        new Thread(()->{
            String[] spec=MODELS[index];File part=new File(models(),spec[2]+".part"),destination=new File(models(),spec[2]);
            try{
                if(destination.isFile()&&destination.length()==Long.parseLong(spec[4])){select(destination,spec[0]);return;}
                long expected=Long.parseLong(spec[4]);
                if(models().getUsableSpace()<expected-part.length()+150*1024*1024L)throw new IOException("Spazio insufficiente. Libera almeno "+(index==0?"2.3":"1.3")+" GB.");
                HttpURLConnection connection=(HttpURLConnection)new URL(spec[1]).openConnection();
                connection.setConnectTimeout(20000);connection.setReadTimeout(60000);connection.setInstanceFollowRedirects(true);
                long offset=part.isFile()?part.length():0;if(offset>0)connection.setRequestProperty("Range","bytes="+offset+"-");
                int code=connection.getResponseCode();if(code!=200&&code!=206)throw new IOException("Download non riuscito (HTTP "+code+"). Riprova o importa un GGUF.");
                if(code==200)offset=0;
                long total=offset,last=0;
                try(InputStream in=connection.getInputStream();OutputStream out=new FileOutputStream(part,offset>0)){
                    byte[] buffer=new byte[262144];int n;while((n=in.read(buffer))!=-1){if(cancelDownload.get())throw new IOException("Download interrotto. Puoi riprenderlo quando vuoi.");out.write(buffer,0,n);total+=n;long now=System.currentTimeMillis();if(now-last>500){last=now;progress=(int)Math.min(99,total*100/expected);notifyStatus();}}
                }finally{connection.disconnect();}
                if(part.length()!=expected)throw new IOException("Download incompleto. Riprova per riprenderlo.");
                message="Verifico il modello scaricato…";notifyStatus();
                MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(part)){byte[] buffer=new byte[262144];int n;while((n=in.read(buffer))!=-1){if(cancelDownload.get())throw new IOException("Verifica interrotta.");digest.update(buffer,0,n);}}
                StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format("%02x",b&255));
                if(!hex.toString().equals(spec[3])){part.delete();throw new IOException("Il file non supera la verifica. Scaricalo di nuovo.");}
                if(!part.renameTo(destination))throw new IOException("Non riesco a salvare il modello.");select(destination,spec[0]);
            }catch(Exception e){message=e.getMessage();}
            finally{downloading=false;busy.set(false);notifyStatus();}
        },"model-download").start();
    }
    private void select(File file,String name){File old=active();activity.getSharedPreferences("native",0).edit().putString("modelFile",file.getName()).putString("modelName",name).apply();if(old!=null&&!old.equals(file))old.delete();progress=100;message="Tutor pronto. La generazione funziona offline.";}
    void importModel(Uri uri){
        if(!busy.compareAndSet(false,true))return;message="Importo il modello…";notifyStatus();
        new Thread(()->{File file=new File(models(),"custom.gguf.part");try{
            long total=0;
            try(InputStream in=activity.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(file)){
                byte[] buffer=new byte[262144];int n;while((n=in.read(buffer))!=-1){total+=n;if(total>5L*1024*1024*1024)throw new IOException("Il modello supera 5 GB: scegli un GGUF più piccolo.");out.write(buffer,0,n);}
            }
            try(DataInputStream check=new DataInputStream(new FileInputStream(file))){if(check.readInt()!=0x47475546)throw new IOException("Il file non è un modello GGUF.");}
            File dest=new File(models(),"custom.gguf");if(!file.renameTo(dest))throw new IOException("Non riesco a salvare il modello.");select(dest,"GGUF importato");
        }catch(Exception e){file.delete();message=e.getMessage();}finally{busy.set(false);notifyStatus();}},"model-import").start();
    }
    void generate(String id,String system,String prompt){
        if(!busy.compareAndSet(false,true)){sendGeneration(id,null,"Il tutor è già impegnato.");return;}
        activity.screenAwake(true);
        new Thread(()->{String text=null,error=null;try{File file=active();if(file==null||!file.isFile())throw new IOException("Scarica o importa prima un modello.");if(system.length()>6000||prompt.length()>6000)throw new IOException("Richiesta troppo lunga.");byte[] result=inferNative(file.getAbsolutePath(),system,prompt,1700);text=new String(result,StandardCharsets.UTF_8);}catch(Exception e){error=e.getMessage();}finally{busy.set(false);activity.screenAwake(false);notifyStatus();}sendGeneration(id,text,error);},"local-inference").start();
    }
    private void sendGeneration(String id,String text,String error){try{JSONObject e=new JSONObject().put("type","generation").put("id",id);if(error!=null)e.put("error",error);else e.put("text",text);activity.event(e);}catch(Exception ignored){}}
    void cancel(){cancelDownload.set(true);cancelNative();}
}

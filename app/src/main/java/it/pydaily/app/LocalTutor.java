package it.pydaily.app;

import android.app.ActivityManager;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.os.Debug;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

final class LocalTutor {
    static {System.loadLibrary("pydaily_llm");}
    private native byte[] inferNative(String id,String path,String system,String prompt,int maxTokens,boolean hint,boolean fairConsent);
    private static native void cancelNative();
    private static native void prepareNative();
    private final MainActivity activity;
    private final AtomicBoolean busy=new AtomicBoolean(false),cancelDownload=new AtomicBoolean(false);
    private volatile boolean downloading=false;
    private volatile int progress=0;
    private volatile String message="";
    private final JSONArray catalogue;
    private volatile JSONObject requestMetrics;
    LocalTutor(MainActivity a){activity=a;JSONArray items=new JSONArray();try(InputStream in=a.getAssets().open("web/models.json")){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1)bytes.write(buffer,0,n);items=new JSONArray(bytes.toString("UTF-8"));}catch(Exception e){message="Catalogo modelli non disponibile.";}catalogue=items;}
    private JSONObject spec(String id){for(int i=0;i<catalogue.length();i++){JSONObject item=catalogue.optJSONObject(i);if(item!=null&&id.equals(item.optString("id")))return item;}return null;}
    private boolean fairConsent(){return activity.getSharedPreferences("native",0).getBoolean("fairNCConsentV1",false);}
    private File models(){File f=new File(activity.getFilesDir(),"models");f.mkdirs();return f;}
    private File active(){String name=activity.getSharedPreferences("native",0).getString("modelFile","");return name.isEmpty()?null:new File(models(),name);}
    JSONObject status(){
        JSONObject result=new JSONObject();File file=active();
        ActivityManager.MemoryInfo memory=new ActivityManager.MemoryInfo();((ActivityManager)activity.getSystemService("activity")).getMemoryInfo(memory);
        try{
            JSONArray installed=new JSONArray(),partial=new JSONArray();String activeId="";
            for(int i=0;i<catalogue.length();i++){JSONObject item=catalogue.getJSONObject(i);File candidate=new File(models(),item.getString("file"));if(candidate.isFile())installed.put(item.getString("id"));if(new File(models(),item.getString("file")+".part").isFile())partial.put(item.getString("id"));if(file!=null&&candidate.equals(file))activeId=item.getString("id");}
            return result.put("type","model-status").put("available",file!=null&&file.isFile()).put("model",activity.getSharedPreferences("native",0).getString("modelName","")).put("activeId",activeId).put("installed",installed).put("partial",partial).put("fairConsent",fairConsent()).put("ramGB",Math.round(memory.totalMem/1073741824.0)).put("availableRamGB",Math.round(memory.availMem/107374182.4)/10.0).put("downloading",downloading).put("progress",progress).put("busy",busy.get()).put("message",message);
        }catch(Exception e){return result;}
    }
    private void notifyStatus(){activity.event(status());}
    void action(String action){
        if(action.equals("cancelDownload")){cancelDownload.set(true);return;}
        if(busy.get()){message="Aspetta la fine dell’operazione in corso.";notifyStatus();return;}
        if(action.equals("accept-fair-license")){activity.getSharedPreferences("native",0).edit().putBoolean("fairNCConsentV1",true).apply();notifyStatus();return;}
        if(action.equals("download3"))action="download:coder3";
        if(action.equals("download1"))action="download:coder1";
        if(action.startsWith("download:")){JSONObject item=spec(action.substring(9));if(item==null)return;if(item.optBoolean("requiresConsent")&&!fairConsent()){message="MobileLLM richiede l’accettazione della licenza FAIR Noncommercial Research.";notifyStatus();return;}download(item);return;}
        if(action.startsWith("remove:")){JSONObject item=spec(action.substring(7));if(item!=null)removeModel(new File(models(),item.optString("file")));return;}
        if(action.equals("pick")){Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");activity.startActivityForResult(intent,MainActivity.PICK_MODEL);return;}
        if(action.equals("delete"))removeModel(active());
    }
    private void removeModel(File file){
        if(file==null)return;File part=new File(models(),file.getName()+".part");
        if((part.exists()&&!part.delete())||(file.exists()&&!file.delete())){message="Non riesco a rimuovere il modello.";notifyStatus();return;}
        if(file.equals(active()))activity.getSharedPreferences("native",0).edit().remove("modelFile").remove("modelName").apply();
        message="Modello e download parziale rimossi. Esercizi e progressi inalterati.";notifyStatus();
    }
    private void download(JSONObject spec){
        if(!busy.compareAndSet(false,true))return;
        cancelDownload.set(false);downloading=true;progress=0;message="Download del modello. Tieni aperta l’app.";notifyStatus();
        new Thread(()->{
            HttpURLConnection connection=null;
            try{
                File part=new File(models(),spec.getString("file")+".part"),destination=new File(models(),spec.getString("file"));long expected=spec.getLong("bytes");
                if(destination.isFile()&&destination.length()==expected){message="Verifico il modello già presente…";notifyStatus();if(verified(destination,spec.getString("sha256"))){select(destination,spec.getString("name"));return;}throw new IOException("Il modello salvato non supera SHA-256. Rimuovilo dal pannello e riscaricalo.");}
                if(part.length()>expected)part.delete();
                if(part.length()==expected){message="Verifico il download già completo…";notifyStatus();if(verified(part,spec.getString("sha256"))){if(!part.renameTo(destination))throw new IOException("Non riesco a salvare il modello.");select(destination,spec.getString("name"));return;}part.delete();}
                long required=expected-part.length()+150*1024*1024L;
                if(models().getUsableSpace()<required)throw new IOException("Spazio insufficiente. Servono ancora circa "+Math.ceil(required/100000000.0)/10+" GB liberi.");
                connection=(HttpURLConnection)new URL(spec.getString("url")).openConnection();
                connection.setConnectTimeout(20000);connection.setReadTimeout(60000);connection.setInstanceFollowRedirects(true);
                long offset=part.isFile()?part.length():0;if(offset>0)connection.setRequestProperty("Range","bytes="+offset+"-");
                int code=connection.getResponseCode();if(code!=200&&code!=206)throw new IOException("Download non riuscito (HTTP "+code+"). Riprova o importa un GGUF.");
                if(code==206&&!(""+connection.getHeaderField("Content-Range")).startsWith("bytes "+offset+"-"))throw new IOException("Il server non ha ripreso il download dal punto corretto.");
                if(code==200)offset=0;
                long total=offset,last=0;
                try(InputStream in=connection.getInputStream();OutputStream out=new FileOutputStream(part,offset>0)){
                    byte[] buffer=new byte[262144];int n;while((n=in.read(buffer))!=-1){if(cancelDownload.get())throw new IOException("Download interrotto. Puoi riprenderlo quando vuoi.");total+=n;if(total>expected)throw new IOException("Il server ha inviato un file troppo grande.");out.write(buffer,0,n);long now=System.currentTimeMillis();if(now-last>500){last=now;progress=(int)Math.min(99,total*100/expected);notifyStatus();}}
                }finally{connection.disconnect();}
                if(part.length()!=expected)throw new IOException("Download incompleto. Riprova per riprenderlo.");
                message="Verifico il modello scaricato…";notifyStatus();
                if(!verified(part,spec.getString("sha256"))){part.delete();throw new IOException("Il file non supera la verifica. Scaricalo di nuovo.");}
                if(!part.renameTo(destination))throw new IOException("Non riesco a salvare il modello.");select(destination,spec.getString("name"));
            }catch(Exception e){message=e.getMessage()==null?"Download non riuscito. Riprova o importa un GGUF.":e.getMessage();}
            finally{if(connection!=null)connection.disconnect();downloading=false;busy.set(false);notifyStatus();}
        },"model-download").start();
    }
    private boolean verified(File file,String sha)throws Exception{MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] buffer=new byte[262144];int n;while((n=in.read(buffer))!=-1){if(cancelDownload.get())throw new IOException("Verifica interrotta.");digest.update(buffer,0,n);}}StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format("%02x",b&255));return hex.toString().equals(sha);}
    private void select(File file,String name){activity.getSharedPreferences("native",0).edit().putString("modelFile",file.getName()).putString("modelName",name).apply();progress=100;message="Tutor selezionato. Gli altri modelli scaricati rimangono disponibili.";}
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
        generate(id,system,prompt,false);
    }
    void generate(String id,String system,String prompt,boolean hint){
        if(!busy.compareAndSet(false,true)){sendGeneration(id,null,"Il tutor è già impegnato.");return;}
        prepareNative();
        requestMetrics=null;
        activity.screenAwake(true);
        message="Avvio del tutor locale…";notifyStatus();
        new Thread(()->{String text=null,error=null;long start=System.nanoTime();try{File file=active();if(file==null||!file.isFile())throw new IOException("Scarica o importa prima un modello.");if(system.length()>6000||prompt.length()>6000)throw new IOException("Richiesta troppo lunga.");byte[] result=inferNative(id,file.getAbsolutePath(),system,prompt,hint?280:1700,hint,fairConsent());text=new String(result,StandardCharsets.UTF_8);}catch(Exception e){error=e.getMessage()==null?"Il tutor non ha completato la richiesta.":e.getMessage();}finally{try{if(requestMetrics==null)requestMetrics=new JSONObject();requestMetrics.put("elapsedMs",(System.nanoTime()-start)/1000000).put("processPssMiB",Debug.getPss()/1024.0);}catch(Exception ignored){}message=error==null?(hint?"Risposta ricevuta: controllo l’indizio.":"Proposta ricevuta: la sfida deve ancora superare revisione e test Python."):error;busy.set(false);activity.screenAwake(false);notifyStatus();}Log.i("PyDailyTutor","request="+id+" elapsedMs="+((System.nanoTime()-start)/1000000)+" success="+(error==null)+(error==null?"":" reason="+error.replace('\n',' ').replace('\r',' ')));sendGeneration(id,text,error);},"local-inference").start();
    }
    private void inferenceMetrics(String id,String json){try{requestMetrics=new JSONObject(json);}catch(Exception ignored){}}
    private void inferenceProgress(String id,String phase,int tokens,long elapsedMs){
        try{activity.event(new JSONObject().put("type","generation-progress").put("id",id).put("phase",phase).put("tokens",tokens).put("elapsedMs",elapsedMs));}catch(Exception ignored){}
    }
    private void sendGeneration(String id,String text,String error){try{JSONObject e=new JSONObject().put("type","generation").put("id",id);if(requestMetrics!=null)e.put("metrics",requestMetrics);if(error!=null)e.put("error",error);else e.put("text",text);activity.event(e);}catch(Exception ignored){}}
    void cancel(){cancelDownload.set(true);cancelNative();}
}

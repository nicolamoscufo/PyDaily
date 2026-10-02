package it.pydaily.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.FrameLayout;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MainActivity extends Activity {
    private WebView web;
    private LocalTutor tutor;
    private String exportText="";
    private String reminderTime="19:30";
    static final int PICK_MODEL=21, EXPORT=22, IMPORT=23, NOTIFICATIONS=24;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(247,248,244));
        getWindow().setNavigationBarColor(Color.rgb(247,248,244));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(247,248,244));
        web=new WebView(this);
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);}
            else{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());}
            return insets;
        });
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);s.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(false);
        web.setBackgroundColor(Color.rgb(247,248,244));
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return asset(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !"pydaily.local".equals(request.getUrl().getHost());}
        });
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request){return asset(request.getUrl());}
        });
        tutor=new LocalTutor(this);
        web.addJavascriptInterface(new Bridge(),"Native");
        web.loadUrl("https://pydaily.local/index.html");
    }

    private WebResourceResponse asset(Uri uri){
        String path=uri.getPath();
        if(!"pydaily.local".equals(uri.getHost())||!"https".equals(uri.getScheme())||path==null||path.contains(".."))return response(403,"Forbidden","text/plain",new ByteArrayInputStream(new byte[0]));
        if(path.equals("/"))path="/index.html";
        String mime="application/octet-stream";
        if(path.endsWith(".html"))mime="text/html";
        else if(path.endsWith(".js")||path.endsWith(".mjs"))mime="text/javascript";
        else if(path.endsWith(".css"))mime="text/css";
        else if(path.endsWith(".json"))mime="application/json";
        else if(path.endsWith(".wasm"))mime="application/wasm";
        else if(path.endsWith(".svg"))mime="image/svg+xml";
        else if(path.endsWith(".png"))mime="image/png";
        else if(path.endsWith(".woff2"))mime="font/woff2";
        else if(path.endsWith(".ttf"))mime="font/ttf";
        else if(path.endsWith(".zip")||path.endsWith(".whl"))mime="application/zip";
        try{return response(200,"OK",mime,getAssets().open("web"+path));}
        catch(IOException e){return response(404,"Not Found","text/plain",new ByteArrayInputStream(new byte[0]));}
    }
    private WebResourceResponse response(int status,String reason,String mime,InputStream stream){
        Map<String,String> headers=new HashMap<>();headers.put("Access-Control-Allow-Origin","https://pydaily.local");headers.put("Cache-Control","public, max-age=86400");
        return new WebResourceResponse(mime,mime.startsWith("text/")?"UTF-8":null,status,reason,headers,stream);
    }
    void event(JSONObject event){runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.PyDailyNative && window.PyDailyNative.onEvent("+event.toString()+")",null);});}
    void screenAwake(boolean value){runOnUiThread(()->{if(web!=null)web.setKeepScreenOn(value);});}
    public final class Bridge {
        @JavascriptInterface public String modelStatus(){return tutor.status().toString();}
        @JavascriptInterface public void modelAction(String action){runOnUiThread(()->tutor.action(action));}
        @JavascriptInterface public void generateExercise(String id,String system,String prompt){tutor.generate(id,system,prompt);}
        @JavascriptInterface public void cancelGeneration(){tutor.cancel();}
        @JavascriptInterface public void exportProgress(String text){if(text.length()>10*1024*1024)return;exportText=text;runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"PyDaily-progressi.json");startActivityForResult(intent,EXPORT);});}
        @JavascriptInterface public void importProgress(){runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");startActivityForResult(intent,IMPORT);});}
        @JavascriptInterface public void reminder(boolean enabled,String time){runOnUiThread(()->setReminder(enabled,time));}
    }
    private void setReminder(boolean enabled,String time){
        if(!time.matches("([01][0-9]|2[0-3]):[0-5][0-9]"))return;
        reminderTime=time;
        if(enabled&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFICATIONS);return;}
        getSharedPreferences("native",0).edit().putBoolean("reminder",enabled).putString("reminderTime",time).apply();
        ReminderReceiver.schedule(this);
        try{event(new JSONObject().put("type","reminder").put("enabled",enabled).put("time",time));}catch(Exception ignored){}
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==NOTIFICATIONS){setReminder(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED,reminderTime);}}
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        Uri uri=data.getData();
        if(code==PICK_MODEL){tutor.importModel(uri);return;}
        new Thread(()->{try{
            if(code==EXPORT){try(OutputStream out=getContentResolver().openOutputStream(uri)){out.write(exportText.getBytes(StandardCharsets.UTF_8));}}
            if(code==IMPORT){ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=getContentResolver().openInputStream(uri)){byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){bytes.write(buf,0,n);if(bytes.size()>10*1024*1024)throw new IOException("Backup troppo grande");}}event(new JSONObject().put("type","backup-import").put("text",bytes.toString("UTF-8")));}
        }catch(Exception e){try{event(new JSONObject().put("type","model-status").put("message","Non riesco a leggere o salvare il file: "+e.getMessage()));}catch(Exception ignored){}}},"progress-backup").start();
    }
    @Override public void onBackPressed(){web.evaluateJavascript("window.PyDailyBack ? window.PyDailyBack() : false",value->{if(!"true".equals(value))super.onBackPressed();});}
    @Override protected void onDestroy(){tutor.cancel();web.removeJavascriptInterface("Native");web.destroy();web=null;super.onDestroy();}
}

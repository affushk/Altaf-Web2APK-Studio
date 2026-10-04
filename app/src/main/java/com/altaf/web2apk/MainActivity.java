package com.altaf.web2apk;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;

public class MainActivity extends Activity {
    static final String HOME="__WEB2APK_URL__", BG="__SPLASH_BG__", ACCENT="__ACCENT__";
    static final int SPLASH_MS=__SPLASH_MS__;

    WebView web;
    ProgressBar progress;
    FrameLayout root;
    TextView splash;
    boolean arenaFrameTried=false;
    boolean fallbackScheduled=false;

    @Override public void onCreate(Bundle b){
        super.onCreate(b);

        getWindow().setStatusBarColor(Color.parseColor(ACCENT));
        getWindow().setNavigationBarColor(Color.parseColor(ACCENT));

        root=new FrameLayout(this);
        web=new WebView(this);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);

        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        FrameLayout.LayoutParams pp=new FrameLayout.LayoutParams(-1,6);
        pp.gravity=Gravity.TOP;
        root.addView(progress,pp);

        splash=new TextView(this);
        splash.setText("__APP_NAME_JAVA__");
        splash.setTextSize(28);
        splash.setTextColor(Color.DKGRAY);
        splash.setGravity(Gravity.CENTER);
        splash.setBackgroundColor(Color.parseColor(BG));
        root.addView(splash,new FrameLayout.LayoutParams(-1,-1));

        setContentView(root);

        web.setBackgroundColor(Color.WHITE);
        web.setLayerType(View.LAYER_TYPE_HARDWARE,null);

        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(__JS_ENABLED__);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(__ZOOM_ENABLED__);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setDefaultTextEncodingName("UTF-8");

        // Advertise as normal mobile Chrome, not Android WebView.
        s.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"
        );

        CookieManager cm=CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web,true);
        cm.flush();

        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int p){
                progress.setProgress(p);
                progress.setVisibility(p>=100?View.GONE:View.VISIBLE);
            }

            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg){
                WebView.HitTestResult hit=view.getHitTestResult();
                String url=hit!=null?hit.getExtra():null;
                if(url!=null && (url.startsWith("http://")||url.startsWith("https://"))){
                    view.loadUrl(url);
                }
                return false;
            }
        });

        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
                Uri u=r.getUrl();
                String q=u.getScheme();

                if("http".equals(q)||"https".equals(q)){
                    if(__EXTERNAL_LINKS__ && !safeHost(u).equals(safeHost(Uri.parse(HOME)))){
                        try{ startActivity(new Intent(Intent.ACTION_VIEW,u)); }catch(Exception ignored){}
                        return true;
                    }
                    return false;
                }

                try{ startActivity(new Intent(Intent.ACTION_VIEW,u)); }catch(Exception ignored){}
                return true;
            }

            @Override public void onPageFinished(WebView v,String url){
                super.onPageFinished(v,url);
                CookieManager.getInstance().flush();

                // Arena pages are a shell around the generated app.
                // Find the largest web iframe and open it directly.
                if(!arenaFrameTried && url.contains("arena.site")){
                    arenaFrameTried=true;
                    v.postDelayed(() -> extractArenaFrame(v),900);
                } else {
                    v.postDelayed(() -> forceRepaint(v),400);
                }
            }

            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){
                if(r.isForMainFrame()) showError("Load error: "+e.getDescription());
            }
        });

        web.loadUrl(HOME);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if(splash.getParent()!=null){
                splash.animate().alpha(0f).setDuration(220).withEndAction(() -> {
                    if(splash.getParent()!=null) root.removeView(splash);
                }).start();
            }
        },SPLASH_MS);
    }

    void extractArenaFrame(WebView v){
        String js=
            "(function(){try{" +
            "var a=[].slice.call(document.querySelectorAll('iframe')).map(function(f){" +
            "var r=f.getBoundingClientRect();return {s:f.src||'',a:(r.width||0)*(r.height||0)};" +
            "}).filter(function(x){return /^https?:\\/\\//i.test(x.s);});" +
            "a.sort(function(x,y){return y.a-x.a;});" +
            "return a.length?a[0].s:'';" +
            "}catch(e){return '';}})();";

        v.evaluateJavascript(js, value -> {
            String frame=jsonString(value);
            if(frame!=null && (frame.startsWith("http://")||frame.startsWith("https://"))
                    && !frame.equals(v.getUrl())){
                v.loadUrl(frame);
            } else {
                forceRepaint(v);
                scheduleBrowserFallbackCheck(v);
            }
        });
    }

    void forceRepaint(WebView v){
        v.evaluateJavascript(
            "(function(){try{" +
            "document.documentElement.style.minHeight='100%';" +
            "if(document.body)document.body.style.minHeight='100%';" +
            "window.dispatchEvent(new Event('resize'));" +
            "return document.body?document.body.innerText.length:-1;" +
            "}catch(e){return -1;}})();",
            null
        );
        v.invalidate();
    }

    void scheduleBrowserFallbackCheck(WebView v){
        if(fallbackScheduled) return;
        fallbackScheduled=true;

        v.postDelayed(() -> v.evaluateJavascript(
            "(function(){try{return document.body?document.body.innerText.trim().length:0;}catch(e){return 0;}})();",
            value -> {
                int len=0;
                try{ len=Integer.parseInt(value.replace("\"","")); }catch(Exception ignored){}
                if(len<20){
                    Toast.makeText(this,"Arena content needs Chrome mode. Opening compatible view…",Toast.LENGTH_LONG).show();
                    openCompatibleBrowser();
                }
            }
        ),2500);
    }

    void openCompatibleBrowser(){
        try{
            Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse(HOME));
            i.setPackage("com.android.chrome");
            startActivity(i);
        }catch(Exception e){
            try{ startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(HOME))); }catch(Exception ignored){}
        }
    }

    String jsonString(String value){
        if(value==null || "null".equals(value)) return null;
        try{
            JSONArray a=new JSONArray("["+value+"]");
            return a.getString(0);
        }catch(Exception e){
            return null;
        }
    }

    String safeHost(Uri u){
        String h=u.getHost();
        return h==null?"":h;
    }

    void showError(String m){
        String safe=m.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;");
        web.loadData(
            "<html><body style='font-family:sans-serif;padding:30px'>" +
            "<h2>Unable to load</h2><p>"+safe+"</p>" +
            "<p>Tap below to open the compatible browser view.</p>" +
            "<button onclick=\"location.href='"+HOME+"'\">Open site</button>" +
            "</body></html>",
            "text/html","UTF-8"
        );
    }

    @Override public void onBackPressed(){
        if(web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}

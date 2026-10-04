package com.altaf.web2apk;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;

public class MainActivity extends Activity {
    static final String HOME="__WEB2APK_URL__", BG="__SPLASH_BG__", ACCENT="__ACCENT__";
    static final int SPLASH_MS=__SPLASH_MS__;
    WebView web;
    ProgressBar progress;
    FrameLayout root;
    TextView splash;

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
        splash.setTextColor(Color.WHITE);
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
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setDefaultTextEncodingName("UTF-8");

        // Some modern sites block or mis-render when Android WebView advertises "; wv".
        // Use the installed WebView's own Chrome UA, but remove only the WebView marker.
        String ua=s.getUserAgentString();
        if(ua!=null){
            ua=ua.replace("; wv","");
            s.setUserAgentString(ua);
        }

        CookieManager cm=CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web,true);
        cm.flush();

        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int p){
                progress.setProgress(p);
                progress.setVisibility(p>=100?View.GONE:View.VISIBLE);
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

                // Force a repaint for JS-heavy SPA pages that sometimes stay visually blank
                // inside Android WebView even after loading successfully.
                v.postDelayed(() -> {
                    v.evaluateJavascript(
                        "(function(){try{document.documentElement.style.minHeight='100%';document.body.style.minHeight='100%';window.dispatchEvent(new Event('resize'));return document.body.innerText.length;}catch(e){return -1;}})();",
                        null
                    );
                    v.invalidate();
                },500);
            }

            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){
                if(r.isForMainFrame()) error("Load error: "+e.getDescription());
            }
        });

        web.loadUrl(HOME);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if(splash.getParent()!=null){
                splash.animate().alpha(0f).setDuration(250).withEndAction(() -> {
                    if(splash.getParent()!=null) root.removeView(splash);
                }).start();
            }
        },SPLASH_MS);
    }

    private String safeHost(Uri u){
        String h=u.getHost();
        return h==null?"":h;
    }

    void error(String m){
        String safe=m.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;");
        web.loadData(
            "<html><body style='font-family:sans-serif;padding:30px'><h2>Unable to load</h2><p>"+safe+"</p><button onclick='location.reload()'>Retry</button></body></html>",
            "text/html","UTF-8"
        );
    }

    @Override public void onBackPressed(){
        if(web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}

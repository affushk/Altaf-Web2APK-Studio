package com.altaf.web2apk;
import android.app.*; import android.os.*; import android.graphics.*; import android.content.*; import android.net.*; import android.view.*; import android.webkit.*; import android.widget.*;
public class MainActivity extends Activity {
 static final String HOME="__WEB2APK_URL__"; WebView web; ProgressBar progress;
 @Override public void onCreate(Bundle b){super.onCreate(b); FrameLayout frame=new FrameLayout(this); web=new WebView(this); progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal); frame.addView(web,new FrameLayout.LayoutParams(-1,-1)); FrameLayout.LayoutParams pp=new FrameLayout.LayoutParams(-1,6); pp.gravity=Gravity.TOP; frame.addView(progress,pp); setContentView(frame);
 WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setLoadsImagesAutomatically(true); s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE); s.setCacheMode(WebSettings.LOAD_DEFAULT); s.setMediaPlaybackRequiresUserGesture(false); CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
 web.setWebChromeClient(new WebChromeClient(){public void onProgressChanged(WebView v,int p){progress.setProgress(p);progress.setVisibility(p>=100?View.GONE:View.VISIBLE);}});
 web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();String q=u.getScheme();if("http".equals(q)||"https".equals(q))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){}return true;} @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())error("Load error: "+e.getDescription());}});
 web.loadUrl(HOME); }
 void error(String m){web.loadData("<html><body style='font-family:sans-serif;padding:30px'><h2>Unable to load</h2><p>"+m+"</p></body></html>","text/html","UTF-8");}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
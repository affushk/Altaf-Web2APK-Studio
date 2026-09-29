package com.altaf.web2apk;
import android.app.*; import android.os.*; import android.graphics.*; import android.content.*; import android.net.*; import android.view.*; import android.webkit.*; import android.widget.*; import java.util.*;
public class MainActivity extends Activity {
 static final String HOME="https://019fb1f6-1a7f-7baf-b3d7-1fa3164d5027.arena.site/";
 WebView web; ProgressBar progress;
 @Override public void onCreate(Bundle b){super.onCreate(b);
  FrameLayout frame=new FrameLayout(this); web=new WebView(this); progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
  frame.addView(web,new FrameLayout.LayoutParams(-1,-1)); FrameLayout.LayoutParams pp=new FrameLayout.LayoutParams(-1,6); pp.gravity=Gravity.TOP; frame.addView(progress,pp); setContentView(frame);
  WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setLoadsImagesAutomatically(true); s.setLoadWithOverviewMode(false); s.setUseWideViewPort(false); s.setMediaPlaybackRequiresUserGesture(false); s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE); s.setCacheMode(WebSettings.LOAD_DEFAULT);
  s.setUserAgentString(s.getUserAgentString()+" AltafWeb2APK/2.1");
  CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
  web.setWebChromeClient(new WebChromeClient(){public void onProgressChanged(WebView v,int p){progress.setProgress(p); progress.setVisibility(p>=100?View.GONE:View.VISIBLE);}});
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl(); String scheme=u.getScheme(); if("http".equals(scheme)||"https".equals(scheme)) return false; try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){} return true;}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame()) showError("Load error: "+e.getDescription());}
   @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse e){if(r.isForMainFrame() && e.getStatusCode()>=400) showError("Website error: HTTP "+e.getStatusCode());}
  });
  web.loadUrl(HOME);
 }
 void showError(String msg){ web.loadDataWithBaseURL(null,"<html><body style='font-family:sans-serif;padding:28px'><h2>Bunny Teacher</h2><p>"+msg+"</p><p>Internet check karke Retry dabao.</p><button style='padding:14px 24px' onclick=\"location.href='"+HOME+"'\">Retry</button></body></html>","text/html","UTF-8",null); }
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
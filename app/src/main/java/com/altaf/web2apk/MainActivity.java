package com.altaf.web2apk;
import android.app.*; import android.os.*; import android.graphics.Color; import android.content.*; import android.net.Uri; import android.view.*; import android.webkit.*; import android.widget.*;
public class MainActivity extends Activity {
  static final String HOME="https://019fb1f6-1a7f-7baf-b3d7-1fa3164d5027.arena.site/";
  WebView web;
  @Override public void onCreate(Bundle b){super.onCreate(b); web=new WebView(this); web.setBackgroundColor(Color.WHITE); WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true); s.setMediaPlaybackRequiresUserGesture(false); web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl(); if("http".equals(u.getScheme())||"https".equals(u.getScheme())) return false; try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){} return true;}}); web.setWebChromeClient(new WebChromeClient()); setContentView(web); web.loadUrl(HOME); }
  @Override public void onBackPressed(){ if(web!=null&&web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
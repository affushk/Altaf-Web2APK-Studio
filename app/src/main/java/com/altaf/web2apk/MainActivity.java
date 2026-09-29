package com.altaf.web2apk;

import android.app.*;
import android.os.*;
import android.graphics.Color;
import android.content.*;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;

public class MainActivity extends Activity {
    LinearLayout root;
    EditText url,name;
    int pad=24;
    @Override public void onCreate(Bundle b){super.onCreate(b); showBuilder();}
    TextView title(String s,int sp){ TextView v=new TextView(this); v.setText(s); v.setTextSize(sp); v.setTextColor(Color.WHITE); v.setPadding(0,12,0,12); return v; }
    EditText input(String hint){ EditText e=new EditText(this); e.setHint(hint); e.setTextColor(Color.WHITE); e.setHintTextColor(0xff8f8f99); e.setSingleLine(true); e.setPadding(24,12,24,12); return e; }
    Button button(String s){ Button b=new Button(this); b.setText(s); b.setAllCaps(false); return b; }
    void showBuilder(){
        ScrollView sc=new ScrollView(this); root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(pad,50,pad,pad); root.setBackgroundColor(0xff101014); sc.addView(root);
        root.addView(title("Altaf Web2APK Studio",28)); root.addView(title("Website → Android App • Proof V1",15));
        url=input("https://your-website.com"); name=input("App name"); root.addView(url); root.addView(name);
        Button preview=button("Preview Website"); preview.setOnClickListener(v->openPreview()); root.addView(preview);
        TextView info=title("Proof V1 checks the core WebView app experience first. GitHub Actions builds this project into an installable APK.",14); info.setTextColor(0xffb8b8c2); root.addView(info);
        Button gh=button("Open GitHub Builds"); gh.setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://github.com/affushk/Altaf-Web2APK-Studio/actions")))); root.addView(gh);
        setContentView(sc);
    }
    void openPreview(){
        String u=url.getText().toString().trim();
        if(u.length()==0){Toast.makeText(this,"Website URL dalo",Toast.LENGTH_SHORT).show();return;}
        if(!u.startsWith("https://")){Toast.makeText(this,"Proof V1 me HTTPS URL use karo",Toast.LENGTH_SHORT).show();return;}
        final WebView w=new WebView(this); WebSettings s=w.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true);
        w.setWebViewClient(new WebViewClient()); w.setWebChromeClient(new WebChromeClient()); w.loadUrl(u); setContentView(w);
    }
    @Override public void onBackPressed(){ showBuilder(); }
}

package com.altaf.bunnyteacher;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

public class MainActivity extends Activity {
    private WebView web;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(255, 138, 101));
        getWindow().setNavigationBarColor(Color.rgb(255, 138, 101));

        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);

        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        FrameLayout.LayoutParams pp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, 5);
        pp.gravity = android.view.Gravity.TOP;
        root.addView(progress, pp);

        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setDefaultTextEncodingName("UTF-8");
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(false);

        web.setBackgroundColor(Color.WHITE);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);

                // Verify the bundled app actually rendered. If the React bundle fails,
                // keep the already-rendered HTML snapshot visible rather than a blank page.
                view.postDelayed(() -> view.evaluateJavascript(
                        "(function(){return document.body ? document.body.innerText.length : 0;})()",
                        value -> {
                            try {
                                int len = Integer.parseInt(value.replace("\"", ""));
                                if (len >= 20) {
                                    Log.i("BunnyTeacher", "BUNNY_READY textLen=" + len);
                                    if (getIntent().getBooleanExtra("smoke_test", false)) {
                                        runSmokeTest(view);
                                    }
                                } else {
                                    Log.w("BunnyTeacher", "BUNNY_NOT_READY textLen=" + len);
                                    view.reload();
                                }
                            } catch (Exception e) {
                                Log.e("BunnyTeacher", "READY_CHECK_ERROR", e);
                            }
                        }
                ), 1200);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("BunnyTeacherWeb",
                        consoleMessage.messageLevel() + ": " + consoleMessage.message());
                return true;
            }
        });

        web.loadUrl("file:///android_asset/www/index.html");
    }

    private void runSmokeTest(WebView view) {
        view.postDelayed(() -> view.evaluateJavascript(
                "(function(){var a=[].slice.call(document.querySelectorAll('button'));var b=a.find(function(x){return (x.innerText||'').indexOf('ABC')>=0;});if(b){b.click();return 'clicked';}return 'missing';})()",
                value -> view.postDelayed(() -> view.evaluateJavascript(
                        "(function(){return !!(document.body && document.body.innerText.indexOf('ABC सीखो!')>=0);})()",
                        ok -> {
                            if ("true".equals(ok)) {
                                Log.i("BunnyTeacher", "ABC_NAV_OK");
                            } else {
                                Log.e("BunnyTeacher", "ABC_NAV_FAIL result=" + ok);
                            }
                        }
                ), 1500)
        ), 600);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

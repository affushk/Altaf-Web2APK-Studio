package com.altaf.bunnyteacher;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

import java.util.Locale;

public class MainActivity extends Activity {
    private WebView web;
    private ProgressBar progress;
    private TextToSpeech tts;
    private volatile String childName = "";
    private volatile String childGender = "other";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(255, 143, 177));
        getWindow().setNavigationBarColor(Color.rgb(167, 139, 250));

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

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                int result = tts.setLanguage(new Locale("hi", "IN"));
                Log.i("BunnyTeacher", "TTS_INIT languageResult=" + result);
            } else {
                Log.w("BunnyTeacher", "TTS_INIT_FAILED status=" + status);
            }
        });
        web.addJavascriptInterface(new TtsBridge(), "AndroidTTS");

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

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

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

    private class TtsBridge {
        @JavascriptInterface
        public void setProfile(String name, String gender) {
            childName = name == null ? "" : name.trim();
            childGender = gender == null ? "other" : gender.trim();
            Log.i("BunnyTeacher", "PROFILE_SYNC name=" + childName + " gender=" + childGender);
        }

        private String personalizeVoiceText(String text) {
            String out = text == null ? "" : text;
            String name = childName == null ? "" : childName.trim();
            if (!name.isEmpty()) {
                out = out.replaceAll("(?i)raabiya", java.util.regex.Matcher.quoteReplacement(name));
                out = out.replaceAll("(?i)rabiya", java.util.regex.Matcher.quoteReplacement(name));
                out = out.replaceAll("(?i)rabia", java.util.regex.Matcher.quoteReplacement(name));
                out = out.replace("राबिया", name);
                out = out.replace("रबिया", name);
            }
            if ("girl".equalsIgnoreCase(childGender)) {
                out = out.replace("बेटा", "बेटी").replace("बच्चा", "बच्ची");
            } else if ("boy".equalsIgnoreCase(childGender)) {
                out = out.replace("बेटी", "बेटा").replace("बच्ची", "बच्चा");
            }
            return out;
        }

        @JavascriptInterface
        public void speak(String text, float rate) {
            runOnUiThread(() -> {
                if (tts == null) return;
                try {
                    String spoken = personalizeVoiceText(text);
                    Log.i("BunnyTeacher", "TTS_SPEAK text=" + spoken);
                    tts.setSpeechRate(Math.max(0.65f, Math.min(1.15f, rate)));
                    tts.setPitch(1.08f);
                    tts.speak(spoken,
                            TextToSpeech.QUEUE_FLUSH, null, "bunny-teacher");
                } catch (Exception e) {
                    Log.e("BunnyTeacher", "TTS_SPEAK_ERROR", e);
                }
            });
        }

        @JavascriptInterface
        public void speakCute(String text) {
            runOnUiThread(() -> {
                if (tts == null) return;
                try {
                    String spoken = personalizeVoiceText(text);
                    Log.i("BunnyTeacher", "TTS_CUTE text=" + spoken);
                    tts.setSpeechRate(0.72f);
                    tts.setPitch(1.16f);
                    tts.speak(spoken,
                            TextToSpeech.QUEUE_FLUSH, null, "bunny-kalima-cute");
                } catch (Exception e) {
                    Log.e("BunnyTeacher", "TTS_CUTE_ERROR", e);
                }
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            if (url == null || url.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e("BunnyTeacher", "OPEN_URL_ERROR", e);
                }
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (tts != null) {
                    try { tts.stop(); } catch (Exception ignored) {}
                }
            });
        }
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
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidTTS");
            web.destroy();
        }
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
        }
        super.onDestroy();
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

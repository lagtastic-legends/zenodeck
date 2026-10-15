package com.omnitool.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.WebViewListener;
import com.omnitool.app.keyboard.ZenoDeckKeyboardBridgePlugin;
import com.omnitool.app.media.ZenoMedia3Plugin;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ZenoDeckNative";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(OmniRecorderPlugin.class);
        registerPlugin(ZenoDeckKeyboardBridgePlugin.class);
        registerPlugin(ZenoMedia3Plugin.class);
        super.onCreate(savedInstanceState);
        
        if (bridge != null) {
            // Set custom BridgeWebViewClient to inject COOP/COEP isolation headers
            // into local assets for SharedArrayBuffer & multithreaded WASM support.
            bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    WebResourceResponse response = super.shouldInterceptRequest(view, request);
                    if (response != null) {
                        Map<String, String> headers = response.getResponseHeaders();
                        if (headers == null) {
                            headers = new HashMap<>();
                        } else {
                            headers = new HashMap<>(headers);
                        }
                        headers.put("Cross-Origin-Opener-Policy", "same-origin");
                        headers.put("Cross-Origin-Embedder-Policy", "credentialless");
                        headers.put("Cross-Origin-Resource-Policy", "cross-origin");
                        response.setResponseHeaders(headers);
                    }
                    return response;
                }
            });

            // Register stability listener to prevent OS from terminating the app
            // if Chromium's rendering process crashes or runs out of memory.
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean didCrash = detail != null && detail.didCrash();
                    int rendererPriority = detail != null ? detail.rendererPriorityAtExit() : -1;
                    Log.e(TAG, "WebView render process exited: didCrash=" + didCrash + ", priority=" + rendererPriority);
                    
                    if (view != null) {
                        try {
                            view.destroy();
                        } catch (Exception ignored) {}
                    }
                    
                    // Recover gracefully on UI thread instead of crashing to home screen
                    runOnUiThread(() -> {
                        try {
                            recreate();
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to recreate activity on render process recovery", e);
                        }
                    });
                    
                    // Returning true tells Android OS that the app handled the crash
                    // and prevents the operating system from terminating the application.
                    return true;
                }
            });

            if (bridge.getWebView() != null) {
                WebView webView = bridge.getWebView();
                WebSettings settings = webView.getSettings();

                // Responsive Autofit & Display Normalization across all phone sizes
                settings.setMediaPlaybackRequiresUserGesture(false);
                // Do NOT force desktop overview mode — let the mobile viewport (width=device-width) govern layout
                settings.setUseWideViewPort(false);
                settings.setLoadWithOverviewMode(false);
                settings.setTextZoom(100); // Prevent OS "Large Text" accessibility setting from distorting layouts
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);

                // Enable natural smooth touch scrolling & 120Hz momentum on Android
                webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
                webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
                webView.setNestedScrollingEnabled(true);
            }
        }

        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        if (Intent.ACTION_SEND.equals(action) && type != null && "text/plain".equals(type)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && !sharedText.trim().isEmpty()) {
                String extractedUrl = extractUrl(sharedText);
                if (extractedUrl != null && !extractedUrl.isEmpty()) {
                    dispatchSharedUrlToWebView(extractedUrl);
                }
            }
        }
    }

    private String extractUrl(String text) {
        if (text == null) return null;
        Pattern pattern = Pattern.compile("https?://\\S+");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(0);
        }
        return text.trim();
    }

    private void dispatchSharedUrlToWebView(final String url) {
        if (bridge == null || bridge.getWebView() == null) return;
        final WebView webView = bridge.getWebView();
        final String escapedUrl = url.replace("'", "\\'");
        final String js = "window.__zenodeck_pending_shared_url = '" + escapedUrl + "'; " +
                          "window.dispatchEvent(new CustomEvent('zenodeck:shared-url', { detail: { url: '" + escapedUrl + "' } }));";
        webView.post(() -> {
            try {
                webView.evaluateJavascript(js, null);
            } catch (Exception e) {
                Log.e(TAG, "Error dispatching shared URL immediately", e);
            }
        });
        webView.postDelayed(() -> {
            try {
                webView.evaluateJavascript(js, null);
            } catch (Exception e) {
                Log.e(TAG, "Error dispatching shared URL post-delayed", e);
            }
        }, 1500);
    }
}

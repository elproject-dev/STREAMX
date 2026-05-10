package com.streamx.app;

import android.os.Bundle;
import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.JsResult;
import android.webkit.JsPromptResult;
import android.webkit.ConsoleMessage;
import android.net.Uri;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();
    WebSettings settings = webView.getSettings();

    settings.setDomStorageEnabled(true);

    // Aktifkan multiple windows agar onCreateWindow dipanggil saat window.open()
    // Lalu kita blokir di onCreateWindow — ini cara paling efektif blokir popup iklan
    settings.setSupportMultipleWindows(true);
    settings.setJavaScriptCanOpenWindowsAutomatically(true);

    // Simpan original Capacitor WebChromeClient
    final WebChromeClient capClient = webView.getWebChromeClient();

    // Wrap dengan custom client: blokir popup, delegate sisanya ke Capacitor
    webView.setWebChromeClient(new WebChromeClient() {

      @Override
      public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
        // BLOKIR semua window.open() / popup dari iframe iklan
        return false;
      }

      // --- Delegate method penting ke Capacitor's original client ---

      @Override
      public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
        if (capClient != null) return capClient.onJsAlert(view, url, message, result);
        return super.onJsAlert(view, url, message, result);
      }

      @Override
      public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
        if (capClient != null) return capClient.onJsConfirm(view, url, message, result);
        return super.onJsConfirm(view, url, message, result);
      }

      @Override
      public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
        if (capClient != null) return capClient.onJsPrompt(view, url, message, defaultValue, result);
        return super.onJsPrompt(view, url, message, defaultValue, result);
      }

      @Override
      public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
        if (capClient != null) return capClient.onConsoleMessage(consoleMessage);
        return super.onConsoleMessage(consoleMessage);
      }

      @Override
      public boolean onShowFileChooser(WebView webView, android.webkit.ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
        if (capClient != null) return capClient.onShowFileChooser(webView, filePathCallback, params);
        return super.onShowFileChooser(webView, filePathCallback, params);
      }

      @Override
      public void onPermissionRequest(android.webkit.PermissionRequest request) {
        if (capClient != null) capClient.onPermissionRequest(request);
        else super.onPermissionRequest(request);
      }

      @Override
      public void onShowCustomView(View view, CustomViewCallback callback) {
        if (capClient != null) capClient.onShowCustomView(view, callback);
        else super.onShowCustomView(view, callback);
      }

      @Override
      public void onHideCustomView() {
        if (capClient != null) capClient.onHideCustomView();
        else super.onHideCustomView();
      }

      @Override
      public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
        if (capClient != null) capClient.onGeolocationPermissionsShowPrompt(origin, callback);
        else super.onGeolocationPermissionsShowPrompt(origin, callback);
      }
    });
  }
}

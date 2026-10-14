# ZenoDeck & ZenoTap — ProGuard / R8 Optimization Rules
# =======================================================

# Preserve Capacitor core, bridge annotations, and JavaScript bridge interfaces
-keep public class * extends com.getcapacitor.Plugin {
    public <methods>;
    public <fields>;
}

-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    public <methods>;
}

-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}

-keep class com.getcapacitor.** { *; }

# Preserve WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class android.webkit.** { *; }

# Preserve ZenoDeck application, headless media engine, and keyboard IME service
-keep class com.omnitool.app.** { *; }
-keep class com.omnitool.app.media.** { *; }
-keep class com.omnitool.app.keyboard.** { *; }
-keep class com.omnitool.app.MainActivity { *; }

# Preserve HBRecorder screen recording dependency
-keep class com.hbisoft.hbrecorder.** { *; }

# Preserve Jetpack Media3 & hardware codecs
-keep class androidx.media3.** { *; }

# Preserve Firebase Auth & Capawesome plugins (if present)
-keep class com.google.firebase.** { *; }
-keep class io.capawesome.capacitorjs.plugins.firebase.** { *; }

# Preserve line numbers and source attributes for production crash analysis
-keepattributes SourceFile,LineNumberTable,*Annotation*,JavascriptInterface
-keepattributes EnclosingMethod,InnerClasses,Signature

# Ignore benign optimization warnings
-dontwarn com.google.firebase.**
-dontwarn androidx.media3.**
-dontwarn com.getcapacitor.**
-dontwarn com.facebook.**
-dontwarn com.google.android.gms.**
-dontwarn io.capawesome.capacitorjs.plugins.firebase.**
-dontwarn play.core.**
-dontwarn org.bouncycastle.**


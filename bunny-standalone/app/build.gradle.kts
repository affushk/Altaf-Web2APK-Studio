plugins {
    id("com.android.application")
}

android {
    namespace = "com.altaf.bunnyteacher"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.altaf.bunnyteacher"
        minSdk = 23
        targetSdk = 35
        versionCode = 3
        versionName = "2.0-standalone"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

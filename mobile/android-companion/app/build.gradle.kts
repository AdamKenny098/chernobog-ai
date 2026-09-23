plugins {
    id("com.google.devtools.ksp")
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "ai.chernobog.companion"
    compileSdk = 37

    defaultConfig {
        applicationId = "ai.chernobog.companion"
        minSdk = 28
        targetSdk = 36
        versionCode = 3
        versionName = "0.3.0"

        testInstrumentationRunner =
            "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility =
            JavaVersion.VERSION_17
        targetCompatibility =
            JavaVersion.VERSION_17
    }
packaging {
        resources {
            excludes +=
                "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.room:room-runtime:2.8.5")
    implementation("androidx.room:room-ktx:2.8.5")
    ksp("androidx.room:room-compiler:2.8.5")
    implementation("androidx.work:work-runtime-ktx:2.11.2")
    val composeBom =
        platform(
            "androidx.compose:compose-bom:2026.08.00",
        )

    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation(
        "androidx.core:core-ktx:1.18.0",
    )
    implementation(
        "androidx.activity:activity-compose:1.13.0",
    )
    implementation(
        "androidx.lifecycle:lifecycle-runtime-ktx:2.10.0",
    )
    implementation(
        "androidx.lifecycle:lifecycle-viewmodel-ktx:2.10.0",
    )
    implementation(
        "androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0",
    )

    implementation(
        "androidx.compose.ui:ui",
    )
    implementation(
        "androidx.compose.ui:ui-tooling-preview",
    )
    implementation(
        "androidx.compose.foundation:foundation",
    )
    implementation(
        "androidx.compose.material3:material3",
    )

    debugImplementation(
        "androidx.compose.ui:ui-tooling",
    )

    testImplementation(
        "junit:junit:4.13.2",
    )
}

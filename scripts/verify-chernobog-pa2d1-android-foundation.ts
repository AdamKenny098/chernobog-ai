import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import path from "node:path";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function read(
  relativePath: string,
): Promise<string> {
  return readFile(
    path.join(
      process.cwd(),
      relativePath,
    ),
    "utf8",
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-2D1 - Android Companion Foundation",
  );
  console.log(
    "==================================================",
  );

  const base =
    "mobile/android-companion";

  const requiredFiles = [
    `${base}/settings.gradle.kts`,
    `${base}/build.gradle.kts`,
    `${base}/gradle.properties`,
    `${base}/app/build.gradle.kts`,
    `${base}/app/src/main/AndroidManifest.xml`,
    `${base}/app/src/main/java/ai/chernobog/companion/MainActivity.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/CompanionViewModel.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/ChernobogApiClient.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/SecureCredentialStore.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/EndpointPolicy.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/CompanionScreen.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/ChernobogEye.kt`,
    `${base}/app/src/test/java/ai/chernobog/companion/EndpointPolicyTest.kt`,
    `${base}/scripts/bootstrap-gradle-wrapper.ps1`,
    `${base}/scripts/build-debug.ps1`,
    `${base}/README.md`,
  ];

  for (
    const relativePath of
    requiredFiles
  ) {
    const content =
      await read(
        relativePath,
      );

    assert.ok(
      content.length > 0,
      `${relativePath} should not be empty`,
    );
  }

  pass(
    "native Android companion project has all PA-2D1 foundation files",
  );

  const projectBuild =
    await read(
      `${base}/build.gradle.kts`,
    );

  const appBuild =
    await read(
      `${base}/app/build.gradle.kts`,
    );

  assert.match(
    projectBuild,
    /com\.android\.application"\) version "9\.4\.0"/,
  );
  assert.doesNotMatch(
    projectBuild,
    /org\.jetbrains\.kotlin\.android/,
  );
  assert.match(
    projectBuild,
    /org\.jetbrains\.kotlin\.plugin\.compose"\) version "2\.3\.21"/,
  );
  assert.doesNotMatch(
    appBuild,
    /org\.jetbrains\.kotlin\.android/,
  );
  assert.doesNotMatch(
    appBuild,
    /kotlinOptions\s*\{/,
  );
  assert.match(
    appBuild,
    /compileSdk = 37/,
  );
  assert.match(
    appBuild,
    /targetSdk = 36/,
  );
  assert.match(
    appBuild,
    /minSdk = 28/,
  );
  assert.match(
    appBuild,
    /compose-bom:2026\.08\.00/,
  );
  assert.match(
    appBuild,
    /activity-compose:1\.13\.0/,
  );

  pass(
    "Android project pins the reviewed PA-2D1 AGP/Kotlin/Compose toolchain",
  );

  const manifest =
    await read(
      `${base}/app/src/main/AndroidManifest.xml`,
    );

  assert.match(
    manifest,
    /android\.permission\.INTERNET/,
  );
  assert.match(
    manifest,
    /android:usesCleartextTraffic="false"/,
  );
  if (
    manifest.includes(
      "BIND_NOTIFICATION_LISTENER_SERVICE",
    )
  ) {
    assert.match(
      manifest,
      /android:name="\.ChernobogNotificationListenerService"/,
    );
    assert.match(
      manifest,
      /android:permission="android\.permission\.BIND_NOTIFICATION_LISTENER_SERVICE"/,
    );
    assert.match(
      manifest,
      /android:exported="false"/,
    );
  }
  assert.doesNotMatch(
    manifest,
    /BIND_ACCESSIBILITY_SERVICE/,
  );
  assert.doesNotMatch(
    manifest,
    /READ_SMS|READ_CALL_LOG|READ_CONTACTS|ACCESS_FINE_LOCATION/,
  );

  pass(
    "PA-2D1 security boundaries remain intact while allowing a later PA-2D2 notification listener; accessibility, SMS, contacts, and location authority remain absent",
  );

  const endpointPolicy =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/EndpointPolicy.kt`,
    );

  assert.match(
    endpointPolicy,
    /uri\.scheme\.equals\([\s\S]*"https"/,
  );
  assert.match(
    endpointPolicy,
    /uri\.userInfo == null/,
  );
  assert.match(
    endpointPolicy,
    /query == null[\s\S]*fragment == null/,
  );

  pass(
    "mobile endpoint policy rejects cleartext, embedded credentials, query parameters, and fragments",
  );

  const credentialStore =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/SecureCredentialStore.kt`,
    );

  assert.match(
    credentialStore,
    /AndroidKeyStore/,
  );
  assert.match(
    credentialStore,
    /AES\/GCM\/NoPadding/,
  );
  assert.match(
    credentialStore,
    /setKeySize\(256\)/,
  );
  assert.match(
    credentialStore,
    /KEY_ENCRYPTED_TOKEN/,
  );
  assert.doesNotMatch(
    credentialStore,
    /putString\(\s*"token"/,
  );

  pass(
    "PA-2A bearer credential is encrypted with an Android Keystore AES-GCM key rather than stored plaintext",
  );

  const apiClient =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/ChernobogApiClient.kt`,
    );

  assert.match(
    apiClient,
    /HttpsURLConnection/,
  );
  assert.match(
    apiClient,
    /\/api\/personal-assistance\/mobile\/enroll/,
  );
  assert.match(
    apiClient,
    /\/api\/personal-assistance\/mobile\/session/,
  );
  assert.match(
    apiClient,
    /Authorization/,
  );
  assert.match(
    apiClient,
    /Bearer \$token/,
  );
  assert.doesNotMatch(
    apiClient,
    /Log\.[vdiew]\s*\([^)]*token|println\s*\([^)]*token/i,
  );

  pass(
    "native client uses HTTPS PA-2A enrollment/session APIs and never logs the bearer token",
  );

  const viewModel =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/CompanionViewModel.kt`,
    );

  assert.match(
    viewModel,
    /saveEnrollment/,
  );
  assert.match(
    viewModel,
    /savedToken/,
  );
  assert.match(
    viewModel,
    /!session[\s\S]*\.capabilities[\s\S]*\.toolExecution/,
  );
  assert.match(
    viewModel,
    /!session[\s\S]*\.capabilities[\s\S]*\.permissionGranting/,
  );

  pass(
    "companion restores its encrypted mobile identity and refuses unexpected mobile execution/permission authority",
  );

  const ui =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/CompanionScreen.kt`,
    );

  const eye =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/ChernobogEye.kt`,
    );

  assert.match(
    ui,
    /CHERNOBOG \/\/ COMPANION/,
  );
  assert.match(
    ui,
    /PRIVATE MOBILE SENSOR NODE/,
  );
  assert.match(
    ui,
    /CAPABILITY BOUNDARY/,
  );
  assert.match(
    eye,
    /Path\(\)/,
  );
  assert.match(
    eye,
    /ChernobogAmber/,
  );

  pass(
    "Android UI carries the Chernobog optic/HUD language rather than a generic material prototype",
  );

  const wrapperBootstrap =
    await read(
      `${base}/scripts/bootstrap-gradle-wrapper.ps1`,
    );

  assert.match(
    wrapperBootstrap,
    /GradleVersion = "9\.6\.0"/,
  );
  assert.match(
    wrapperBootstrap,
    /bbaeb2fef8710818cf0e261201dab964c572f92b942812df0c3620d62a529a01/,
  );
  assert.match(
    wrapperBootstrap,
    /Get-FileHash/,
  );

  pass(
    "Gradle wrapper bootstrap pins the official 9.6.0 distribution and verifies its SHA-256 before execution",
  );

  const serverDependencies = [
    "app/api/personal-assistance/mobile/enroll/route.ts",
    "app/api/personal-assistance/mobile/session/route.ts",
    "app/api/personal-assistance/mobile/heartbeat/route.ts",
    "app/api/personal-assistance/mobile/notifications/route.ts",
    "app/api/personal-assistance/mobile/notifications/reconcile/route.ts",
  ];

  for (
    const relativePath of
    serverDependencies
  ) {
    const content =
      await read(
        relativePath,
      );

    assert.ok(
      content.length > 0,
    );
  }

  pass(
    "PA-2D1 is grounded on the accepted PA-2A/PA-2B/PA-2C server API surface",
  );

  const gitignore =
    await read(
      ".gitignore",
    );

  assert.match(
    gitignore,
    /mobile\/android-companion\/\.gradle/,
  );
  assert.match(
    gitignore,
    /mobile\/android-companion\/local\.properties/,
  );
  assert.match(
    gitignore,
    /mobile\/android-companion\/\*\*\/build/,
  );

  pass(
    "Android local SDK/build state is excluded without excluding wrapper or source files",
  );

  console.log(
    "==================================================",
  );
  console.log(
    "PASS PA-2D1 Android Companion Foundation acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);

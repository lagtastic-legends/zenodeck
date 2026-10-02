# Contributing to ZenoDeck

Thank you for your interest in contributing to **ZenoDeck**! We welcome contributions from developers, designers, and open-source enthusiasts passionate about on-device computing, privacy-first media engineering, and native performance.

---

## Code of Conduct

* Be respectful, inclusive, and collaborative.
* Focus on delivering high-performance, private, client-side tools that never compromise user data privacy.
* Adhere strictly to the **Zero-Upload Architecture**: all media and document transformations must occur in WebAssembly or browser-native hardware APIs.

---

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lagtastic-legends/zenodeck.git
   cd zenodeck
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Run TypeScript check & Automated Test Suites:**
   ```bash
   npm run typecheck
   npm run test:all
   ```

5. **Run web production build check:**
   ```bash
   npm run build
   ```

---

## Mobile Build Pipeline (Android APK)

ZenoDeck uses Capacitor to package the static Next.js export into a native Android application:

1. **Generate Static Export for Mobile:**
   ```bash
   npm run build:mobile
   ```

2. **Sync Assets to Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Build Android APK:**
   - **Debug Build:**
     ```bash
     cd android
     ./gradlew assembleDebug      # Linux/macOS
     .\gradlew.bat assembleDebug  # Windows
     ```
     Output: `android/app/build/outputs/apk/debug/app-debug.apk`

   - **Signed Release Build:**
     ```bash
     cd android
     ./gradlew assembleRelease      # Linux/macOS
     .\gradlew.bat assembleRelease  # Windows
     ```
     Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Pull Request Guidelines

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature-name
   ```
2. **Commit Conventions:** Follow Conventional Commits format:
   - `feat: add WebCodecs AV1 decoder support`
   - `fix: resolve iOS Safari audio unlock race condition`
   - `perf: optimize WebAssembly memory buffer growth`
   - `docs: update mobile build instructions`
3. **Zero-Upload Guarantee**: Verify that zero file data or media streams are ever dispatched over network sockets or remote APIs.
4. **Verification**: Verify that `npm run build` succeeds cleanly with 0 TypeScript or lint errors.
5. **PR Description**: Fill out the pull request template completely, describing the changes, motivation, and verification steps.

---

## Questions & Support

Reach out to the maintainers at [support.zenodeck@gmail.com](mailto:support.zenodeck@gmail.com) or join the discussion in GitHub Issues.

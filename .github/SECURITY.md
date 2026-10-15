# Security Policy

## The Zero-Upload Guarantee

**ZenoDeck** is built from the ground up on an absolute privacy architecture:
* **100% Client-Side Execution**: All media conversions, audio filter processing, PDF forging, and video compression occur strictly inside your device's memory using WebAssembly (@ffmpeg/ffmpeg, @cantoo/pdf-lib) and native browser APIs (Web Audio, WebCodecs, WebGL 2.0).
* **Zero Remote File Transfers**: No audio, video, image, or document data is ever transmitted, cached, or analyzed on remote servers.
* **Local Storage & Vault**: Files stored in the Vault reside exclusively in your browser's local IndexedDB and native Android sandboxed storage.

---

## Supported Versions

| Version | Supported          |
| :---    | :---               |
| 3.16.x  | :white_check_mark: |
| 3.15.x  | :white_check_mark: |
| 3.14.x  | :white_check_mark: |
| 3.13.x  | :white_check_mark: |
| 3.12.x  | :white_check_mark: |
| 3.11.x  | :white_check_mark: |
| 3.10.x  | :white_check_mark: |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or privacy concern, please do not file a public issue. Instead, report it privately to our security team:

* **Security & Support Email**: [support.zenodeck@gmail.com](mailto:support.zenodeck@gmail.com)
* **Response SLA**: We review and acknowledge all security reports within 24 hours.
* **Public Disclosure**: We coordinate responsible disclosure once a fix has been verified and released across all platforms.

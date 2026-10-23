# Dead Ends Log

| Iteration | Approach Tried | Why It Failed | Files Touched |
|-----------|---------------|---------------|---------------|
| 2 (M2) | `currentPreferred != lastAttemptedCandidate` in candidate selection | When a worker attempts fallback node 1, `lastAttemptedCandidate` becomes 1 while `currentPreferred` remains 0. On attempt 3, `currentPreferred != lastAttemptedCandidate` evaluates to true, forcing attempt 3 back to node 0. Retries oscillate as `[0, 1, 0, 1, 0]`, starving nodes 2 and 3 and prematurely failing the download. Must track `lastObservedPreferred` instead. | `android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt` |

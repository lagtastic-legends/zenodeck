import os
import subprocess
import sys
import time

scripts_dir = os.path.dirname(os.path.abspath(__file__))
test_files = sorted([f for f in os.listdir(scripts_dir) if f.startswith("test-") and f.endswith(".ts")])

print(f"Discovered {len(test_files)} test scripts.")

passed = []
failed = []
skipped = []

for idx, test_file in enumerate(test_files, start=1):
    test_path = os.path.join(scripts_dir, test_file)
    print(f"[{idx}/{len(test_files)}] Running {test_file}...", flush=True)
    start_t = time.time()
    try:
        proc = subprocess.run(
            ["npx", "tsx", test_path],
            capture_output=True,
            text=True,
            timeout=40,
            shell=True
        )
        elapsed = round(time.time() - start_t, 2)
        if proc.returncode == 0:
            print(f"  ✓ PASSED ({elapsed}s)", flush=True)
            passed.append((test_file, elapsed))
        else:
            print(f"  ✗ FAILED ({elapsed}s) with code {proc.returncode}", flush=True)
            failed.append((test_file, elapsed, proc.stdout, proc.stderr))
    except subprocess.TimeoutExpired:
        print(f"  ✗ TIMEOUT (>40s)", flush=True)
        failed.append((test_file, 40, "", "Timeout expired"))
    except Exception as e:
        print(f"  ✗ ERROR: {e}", flush=True)
        failed.append((test_file, 0, "", str(e)))

print("\n" + "=" * 60)
print(f"SUMMARY: {len(passed)} Passed, {len(failed)} Failed out of {len(test_files)}")
print("=" * 60)

if failed:
    print("\nFAILED TESTS:")
    for f in failed:
        print(f"\n--- {f[0]} ---")
        if f[2]:
            print("STDOUT (last 500 chars):\n" + f[2][-500:])
        if f[3]:
            print("STDERR (last 500 chars):\n" + f[3][-500:])
    sys.exit(1)
else:
    print("\nALL TEST SUITES PASSED PERFECTLY!")
    sys.exit(0)

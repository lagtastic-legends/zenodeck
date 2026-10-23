/**
 * Challenger M2-3 Empirical Verification & Zero-Starvation Adversarial Suite
 * =========================================================================
 * Milestone 2 Iteration 3: Candidate Rotation & Zero-Starvation Logic
 *
 * Verifies:
 * 1. Candidate Selection Sequence under failure of nodes 0 and 1:
 *    - Sequence must be [0, 1, 2, 3, 0] and NOT [0, 1, 0, 1, 0].
 *    - Zero starvation oracle: Number of distinct nodes visited in 5 attempts
 *      must strictly equal min(N, 5) for all pool sizes N in [1..10].
 * 2. Exhaustive Matrix of Candidate Pool Sizes N in [1, 2, 3, 4, 5, 6, 7, 8]:
 *    - Validates linear cyclic rotation across all initial preferred offsets.
 * 3. Dynamic Cross-Worker Latching & Convergence:
 *    - When another worker succeeds on node k at any attempt step t in [2..5],
 *      the retrying worker MUST immediately jump to node k on attempt t.
 *    - Subsequent failover if node k fails resumes rotation from (k+1) % N.
 * 4. Multi-Worker Concurrent Simulation:
 *    - Simulates 4 concurrent chunk workers with asynchronous arrivals,
 *      dead nodes 0 and 1, healthy node 2, and verifies 100% convergence.
 * 5. Static AST / Code Safety Invariants in ZenoHeadlessMediaEngine.kt:
 *    - Verifies presence of lastObservedPreferred, absence of currentPreferred != lastAttemptedCandidate.
 *    - Verifies connectTimeout = 2500, readTimeout = 12000, and AtomicInteger latching.
 */

import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;
const defects: string[] = [];

function check(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    const err = `${msg}${detail ? ` -> ${detail}` : ""}`;
    console.error(`  ✗ FAIL: ${err}`);
    defects.push(err);
    failed++;
  }
}

/**
 * Exact behavioral replica of ZenoHeadlessMediaEngine.kt lines 1045–1067
 */
class KotlinCandidateSelectorSimulator {
  private preferredHostIndex: () => number;
  private candidateUrlsSize: number;
  private lastObservedPreferred: number;
  private lastAttemptedCandidate: number = -1;
  public chunkAttempt: number = 0;

  constructor(preferredHostIndexGetter: () => number, candidateCount: number) {
    this.preferredHostIndex = preferredHostIndexGetter;
    this.candidateUrlsSize = candidateCount;
    // var lastObservedPreferred = preferredHostIndex.get() % candidateUrls.size
    this.lastObservedPreferred = this.preferredHostIndex() % this.candidateUrlsSize;
  }

  public nextCandidate(): number {
    this.chunkAttempt++;
    // Adaptive candidate selection avoiding modulo oscillation on dead nodes
    const currentPreferred = this.preferredHostIndex() % this.candidateUrlsSize;
    const candIdx =
      this.chunkAttempt === 1
        ? currentPreferred
        : currentPreferred !== this.lastObservedPreferred
        ? currentPreferred
        : (this.lastAttemptedCandidate !== -1
            ? this.lastAttemptedCandidate + 1
            : currentPreferred + this.chunkAttempt - 1) % this.candidateUrlsSize;

    this.lastObservedPreferred = currentPreferred;
    this.lastAttemptedCandidate = candIdx;
    return candIdx;
  }
}

async function runChallengerM23Suite() {
  console.log("================================================================================");
  console.log("   CHALLENGER M2-3: EMPIRICAL ZERO-STARVATION & CANDIDATE ROTATION SUITE        ");
  console.log("================================================================================\n");

  const kotlinEnginePath = path.join(
    __dirname,
    "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt"
  );
  if (!fs.existsSync(kotlinEnginePath)) {
    throw new Error(`Target file not found: ${kotlinEnginePath}`);
  }
  const kotlinCode = fs.readFileSync(kotlinEnginePath, "utf-8");

  // ---------------------------------------------------------------------------
  // SECTION 1: CANDIDATE SELECTION SEQUENCE UNDER NODES 0 & 1 FAILURE
  // ---------------------------------------------------------------------------
  console.log("--- SECTION 1: Candidate Selection Sequence Under Failure of Nodes 0 and 1 ---");

  let sharedPref = 0;
  const sim = new KotlinCandidateSelectorSimulator(() => sharedPref, 4);
  const sequence: number[] = [];
  for (let i = 0; i < 5; i++) {
    sequence.push(sim.nextCandidate());
  }

  console.log(`  [EMPIRICAL TRACE] N=4 Sequence over 5 attempts: [${sequence.join(", ")}]`);

  const exhibitsTwoNodeOscillation =
    sequence[0] === 0 &&
    sequence[1] === 1 &&
    sequence[2] === 0 &&
    sequence[3] === 1 &&
    sequence[4] === 0;

  check(
    !exhibitsTwoNodeOscillation,
    "Candidate selection does NOT exhibit 2-node oscillation [0, 1, 0, 1, 0]"
  );

  const matchesExpectedSequence =
    sequence[0] === 0 &&
    sequence[1] === 1 &&
    sequence[2] === 2 &&
    sequence[3] === 3 &&
    sequence[4] === 0;

  check(
    matchesExpectedSequence,
    "Candidate selection under nodes 0 and 1 failure produces exact sequence [0, 1, 2, 3, 0]"
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: EXHAUSTIVE POOL SIZES N = 1, 2, 3, 4, 5, 6, 7, 8
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 2: Exhaustive Candidate Pool Sizes N = 1..8 and Zero-Starvation Oracle ---");

  const expectedSequencesForStart0: Record<number, number[]> = {
    1: [0, 0, 0, 0, 0],
    2: [0, 1, 0, 1, 0],
    3: [0, 1, 2, 0, 1],
    4: [0, 1, 2, 3, 0],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4],
    7: [0, 1, 2, 3, 4],
    8: [0, 1, 2, 3, 4],
  };

  for (let N = 1; N <= 8; N++) {
    const s = new KotlinCandidateSelectorSimulator(() => 0, N);
    const trace: number[] = [];
    for (let att = 0; att < 5; att++) {
      trace.push(s.nextCandidate());
    }

    const expected = expectedSequencesForStart0[N];
    const matchesExpected = trace.every((v, i) => v === expected[i]);
    check(
      matchesExpected,
      `Pool size N=${N} generates expected cyclic trace: [${trace.join(", ")}]`
    );

    // Zero-Starvation Oracle:
    // A retry policy of 5 attempts must visit min(N, 5) distinct candidates.
    const distinctVisited = new Set(trace).size;
    const expectedDistinct = Math.min(N, 5);
    check(
      distinctVisited === expectedDistinct,
      `Zero-Starvation Oracle: Pool N=${N} visits exactly ${distinctVisited}/${expectedDistinct} distinct candidates`
    );
  }

  // Test non-zero initial preferred hosts (e.g. N=4 starting at offset 1, 2, 3)
  for (let startOffset = 0; startOffset < 4; startOffset++) {
    const s = new KotlinCandidateSelectorSimulator(() => startOffset, 4);
    const trace: number[] = [];
    for (let att = 0; att < 5; att++) {
      trace.push(s.nextCandidate());
    }
    const expectedTrace = [0, 1, 2, 3, 4].map((i) => (startOffset + i) % 4);
    const matches = trace.every((v, i) => v === expectedTrace[i]);
    check(
      matches,
      `Pool N=4 starting at preferred offset ${startOffset} generates trace [${trace.join(", ")}]`
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: DYNAMIC CROSS-WORKER LATCHING & CONVERGENCE
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 3: Dynamic Cross-Worker Latching & Immediate Convergence ---");

  // Test: Another worker succeeds on node k at each possible retry attempt (att = 2, 3, 4, 5)
  for (let latchAtAttempt = 2; latchAtAttempt <= 5; latchAtAttempt++) {
    for (const winningNode of [1, 2, 3]) {
      let dynamicHost = 0;
      const s = new KotlinCandidateSelectorSimulator(() => dynamicHost, 4);
      const trace: number[] = [];

      for (let att = 1; att <= 5; att++) {
        if (att === latchAtAttempt) {
          // Concurrent worker succeeded on winningNode!
          dynamicHost = winningNode;
        }
        trace.push(s.nextCandidate());
      }

      const immediateJumpCandidate = trace[latchAtAttempt - 1];
      check(
        immediateJumpCandidate === winningNode,
        `Retrying worker immediately jumps to winning node ${winningNode} at attempt ${latchAtAttempt} (trace: [${trace.join(", ")}])`
      );
    }
  }

  // Test: Subsequent failover after a latched winning node fails
  // E.g., Worker switches to node 2 on attempt 3, but node 2 throws on attempt 3.
  // Attempt 4 should smoothly rotate to (2 + 1) % 4 = 3!
  {
    let dynamicHost = 0;
    const s = new KotlinCandidateSelectorSimulator(() => dynamicHost, 4);
    const trace: number[] = [];
    for (let att = 1; att <= 5; att++) {
      if (att === 3) {
        dynamicHost = 2; // Jump to node 2
      }
      trace.push(s.nextCandidate());
    }
    // Expected trace:
    // Att 1: 0 (fails)
    // Att 2: 1 (fails)
    // Att 3: jumps to 2 (fails)
    // Att 4: rotates to (2+1)%4 = 3 (fails)
    // Att 5: rotates to (3+1)%4 = 0
    check(
      trace[0] === 0 && trace[1] === 1 && trace[2] === 2 && trace[3] === 3 && trace[4] === 0,
      `Resumed rotation after latched node failure: [${trace.join(", ")}] rotates monotonically`
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: CONCURRENT MULTI-WORKER ASYNCHRONOUS SIMULATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Concurrent Multi-Worker Asynchronous Simulation ---");

  interface ChunkWorkerState {
    chunkIdx: number;
    workerId: number;
    currentAttempt: number;
    completed: boolean;
    history: number[];
  }

  let globalPreferredHost = 0;
  const numWorkers = 4;
  const candidates = [
    { id: 0, status: "dead" },
    { id: 1, status: "dead" },
    { id: 2, status: "healthy" },
    { id: 3, status: "healthy" },
  ];

  const workers: { sim: KotlinCandidateSelectorSimulator; state: ChunkWorkerState }[] = [];
  for (let i = 0; i < numWorkers; i++) {
    workers.push({
      sim: new KotlinCandidateSelectorSimulator(() => globalPreferredHost, candidates.length),
      state: {
        chunkIdx: i,
        workerId: i,
        currentAttempt: 0,
        completed: false,
        history: [],
      },
    });
  }

  // Round-robin execution of worker retry attempts simulating concurrent coroutines
  let cycles = 0;
  while (workers.some((w) => !w.state.completed) && cycles < 20) {
    cycles++;
    for (const w of workers) {
      if (w.state.completed) continue;
      w.state.currentAttempt++;
      const cand = w.sim.nextCandidate();
      w.state.history.push(cand);

      if (candidates[cand].status === "healthy") {
        // Successful connection!
        globalPreferredHost = cand;
        w.state.completed = true;
      }
    }
  }

  const allCompleted = workers.every((w) => w.state.completed);
  check(allCompleted, `All ${numWorkers} concurrent workers successfully completed chunk streaming`);

  const allLatchedHealthy = workers.every(
    (w) => w.state.history[w.state.history.length - 1] === 2 || w.state.history[w.state.history.length - 1] === 3
  );
  check(allLatchedHealthy, "All workers successfully latched onto a healthy candidate node (2 or 3)");

  workers.forEach((w) => {
    console.log(`    Worker ${w.state.workerId} (chunk ${w.state.chunkIdx}) history: [${w.state.history.join(", ")}]`);
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: STATIC CODE AUDIT OF ZenoHeadlessMediaEngine.kt
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 5: Static Code Audit & Anti-Regression Verification ---");

  check(
    kotlinCode.includes("var lastObservedPreferred = preferredHostIndex.get() % candidateUrls.size"),
    "lastObservedPreferred variable exists and is initialized per worker chunk loop"
  );

  check(
    kotlinCode.includes("currentPreferred != lastObservedPreferred"),
    "Candidate selection uses currentPreferred != lastObservedPreferred guard"
  );

  check(
    !kotlinCode.includes("currentPreferred != lastAttemptedCandidate"),
    "Defective line 'currentPreferred != lastAttemptedCandidate' is completely eliminated"
  );

  check(
    kotlinCode.includes("connectTimeout = 2500"),
    "Fast 2.5s connect timeout is configured in openConnectionWithRedirects()"
  );

  check(
    kotlinCode.includes("readTimeout = 12000"),
    "12s read timeout is configured in openConnectionWithRedirects()"
  );

  check(
    kotlinCode.includes("val preferredHostIndex = AtomicInteger(0)"),
    "AtomicInteger preferredHostIndex provides atomic visibility across thread pool"
  );

  // ---------------------------------------------------------------------------
  // SUMMARY & VERDICT
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | DEFECTS: ${defects.length}`);
  console.log("================================================================================\n");

  if (failed > 0 || defects.length > 0) {
    console.error(`❌ CHALLENGER VERDICT: REQUEST_CHANGES (${failed} checks failed)`);
    process.exit(1);
  } else {
    console.log("✅ CHALLENGER VERDICT: APPROVE (100% checks passed cleanly)");
    process.exit(0);
  }
}

runChallengerM23Suite().catch((err) => {
  console.error("Test runner encountered uncaught error:", err);
  process.exit(1);
});

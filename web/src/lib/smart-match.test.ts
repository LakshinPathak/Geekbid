import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSkillsScore,
  computeWinRate,
  computeBidHistoryScore,
  computeSmartMatchScore,
  isEligibleCandidate,
  rankFreelancersForJob,
  type JobRecord,
} from "./smart-match.ts";

function job(id: string, skills: string[], extra: Partial<JobRecord> = {}): JobRecord {
  return { id, skillsRequired: skills, ...extra };
}

function jobsMap(entries: JobRecord[]): Map<string, JobRecord> {
  return new Map(entries.map((j) => [j.id, j]));
}

describe("computeSkillsScore", () => {
  it("returns 0 when job has no required skills", () => {
    assert.equal(computeSkillsScore([], ["React"]), 0);
  });

  it("computes overlap as fraction of job skills", () => {
    assert.equal(computeSkillsScore(["React", "Node"], ["React", "Node", "TS"]), 100);
    assert.equal(computeSkillsScore(["React", "Node", "TS"], ["React"]), 33);
    assert.equal(computeSkillsScore(["React"], ["Vue"]), 0);
  });
});

describe("computeWinRate", () => {
  it("returns 0 with no bids", () => {
    assert.equal(computeWinRate("f1", [], jobsMap([])), 0);
  });

  it("uses acceptedBids / uniqueJobsBid", () => {
    const jobs = jobsMap([
      job("j1", ["React"], { acceptedBy: "f1" }),
      job("j2", ["Node"]),
      job("j3", ["Go"]),
    ]);
    const bids = [{ jobId: "j1" }, { jobId: "j2" }, { jobId: "j3" }];
    assert.equal(computeWinRate("f1", bids, jobs), 33);
  });
});

describe("computeBidHistoryScore", () => {
  it("returns 0 with no similar-skill history", () => {
    const jobs = jobsMap([job("j1", ["Go"])]);
    assert.equal(computeBidHistoryScore("f1", ["React"], [{ jobId: "j1" }], jobs), 0);
  });

  it("scores fraction of positive outcomes on similar-skill bids", () => {
    const jobs = jobsMap([
      // Accepted but not yet completed — not a proven positive outcome.
      job("j1", ["React"], { acceptedBy: "f1" }),
      job("j2", ["React", "Node"]),
      job("j3", ["React"], { status: "completed", acceptedBy: "f1" }),
    ]);
    const bids = [{ jobId: "j1" }, { jobId: "j2" }, { jobId: "j3" }];
    assert.equal(computeBidHistoryScore("f1", ["React"], bids, jobs), 33);
  });

  it("does not count accepted-but-in-progress jobs as positive history", () => {
    const jobs = jobsMap([job("j1", ["React"], { acceptedBy: "f1" })]);
    assert.equal(computeBidHistoryScore("f1", ["React"], [{ jobId: "j1" }], jobs), 0);
  });
});

describe("computeSmartMatchScore", () => {
  it("applies 50/30/20 weights", () => {
    const jobs = jobsMap([
      job("j1", ["React"], { status: "completed", acceptedBy: "f1" }),
    ]);
    const result = computeSmartMatchScore(
      "f1",
      ["React", "Node"],
      ["React", "Node", "TS"],
      [{ jobId: "j1" }],
      jobs
    );
    // skills 100, winRate 100, bidHistory 100 → 100
    assert.equal(result.score, 100);
    assert.deepEqual(result.breakdown, { skills: 100, winRate: 100, bidHistory: 100 });
  });

  it("is deterministic for same inputs", () => {
    const jobs = jobsMap([job("j1", ["React"])]);
    const a = computeSmartMatchScore("f1", ["React"], ["React"], [{ jobId: "j1" }], jobs);
    const b = computeSmartMatchScore("f1", ["React"], ["React"], [{ jobId: "j1" }], jobs);
    assert.deepEqual(a, b);
  });
});

describe("isEligibleCandidate", () => {
  it("excludes invited and bidding freelancers", () => {
    const invited = new Set(["a"]);
    const bidding = new Set(["b"]);
    assert.equal(isEligibleCandidate("a", invited, bidding), false);
    assert.equal(isEligibleCandidate("b", invited, bidding), false);
    assert.equal(isEligibleCandidate("c", invited, bidding), true);
  });
});

describe("rankFreelancersForJob", () => {
  it("sorts by score desc, then geekScore, then name", () => {
    const jobs = jobsMap([]);
    const ranked = rankFreelancersForJob(
      ["React"],
      [
        { id: "f1", fullName: "Zara", geekScore: 600, skills: ["React"] },
        { id: "f2", fullName: "Amy", geekScore: 800, skills: ["React", "Node"] },
        { id: "f3", fullName: "Bob", geekScore: 800, skills: ["Vue"] },
      ],
      new Map(),
      jobs,
      new Set(),
      new Set()
    );
    assert.equal(ranked[0].freelancerId, "f2");
    assert.equal(ranked[ranked.length - 1].freelancerId, "f3");
  });

  it("omits already-invited and already-bid freelancers", () => {
    const jobs = jobsMap([]);
    const ranked = rankFreelancersForJob(
      ["React"],
      [
        { id: "f1", fullName: "A", geekScore: 500, skills: ["React"] },
        { id: "f2", fullName: "B", geekScore: 500, skills: ["React"] },
      ],
      new Map(),
      jobs,
      new Set(["f1"]),
      new Set(["f2"])
    );
    assert.equal(ranked.length, 0);
  });
});

export interface SmartMatchBreakdown {
  skills: number;
  winRate: number;
  bidHistory: number;
}

export interface SmartMatchScore {
  score: number;
  breakdown: SmartMatchBreakdown;
}

export interface FreelancerBidRecord {
  jobId: string;
}

export interface JobRecord {
  id: string;
  skillsRequired?: string[];
  acceptedBy?: string;
  status?: string;
}

export interface FreelancerCandidate {
  id: string;
  fullName: string;
  geekScore: number;
  skills: string[];
}

export interface RankedMatch extends SmartMatchScore {
  freelancerId: string;
  fullName: string;
  geekScore: number;
}

/** Skills overlap vs job required set (0–100). */
export function computeSkillsScore(jobSkills: string[], freelancerSkills: string[]): number {
  if (jobSkills.length === 0) return 0;
  const overlap = jobSkills.filter((s) => freelancerSkills.includes(s)).length;
  return Math.round((overlap / jobSkills.length) * 100);
}

/** Win rate: accepted bids / unique jobs bid (dashboard semantics). */
export function computeWinRate(
  freelancerId: string,
  bids: FreelancerBidRecord[],
  jobsById: Map<string, JobRecord>
): number {
  const uniqueJobsBid = new Set(bids.map((b) => b.jobId)).size;
  if (uniqueJobsBid === 0) return 0;

  const acceptedBids = bids.filter((b) => {
    const job = jobsById.get(b.jobId);
    return job?.acceptedBy === freelancerId;
  });

  return Math.round((acceptedBids.length / uniqueJobsBid) * 100);
}

/** Similar-skill bid history quality (0–100). */
export function computeBidHistoryScore(
  freelancerId: string,
  targetJobSkills: string[],
  bids: FreelancerBidRecord[],
  jobsById: Map<string, JobRecord>
): number {
  const similarSkillBids = bids.filter((b) => {
    const job = jobsById.get(b.jobId);
    const required = job?.skillsRequired ?? [];
    return required.some((s) => targetJobSkills.includes(s));
  });

  if (similarSkillBids.length === 0) return 0;

  const positive = similarSkillBids.filter((b) => {
    const job = jobsById.get(b.jobId);
    if (!job) return false;
    // Only count a job as positive history once it's actually completed —
    // "accepted but still in progress" isn't a proven positive outcome yet.
    return job.status === "completed" && job.acceptedBy === freelancerId;
  });

  return Math.round((positive.length / similarSkillBids.length) * 100);
}

export function computeSmartMatchScore(
  freelancerId: string,
  jobSkills: string[],
  freelancerSkills: string[],
  bids: FreelancerBidRecord[],
  jobsById: Map<string, JobRecord>
): SmartMatchScore {
  const skills = computeSkillsScore(jobSkills, freelancerSkills);
  const winRate = computeWinRate(freelancerId, bids, jobsById);
  const bidHistory = computeBidHistoryScore(freelancerId, jobSkills, bids, jobsById);
  const score = Math.round(0.5 * skills + 0.3 * winRate + 0.2 * bidHistory);
  return { score, breakdown: { skills, winRate, bidHistory } };
}

export function isEligibleCandidate(
  freelancerId: string,
  invitedFreelancerIds: Set<string>,
  biddingFreelancerIds: Set<string>
): boolean {
  if (invitedFreelancerIds.has(freelancerId)) return false;
  if (biddingFreelancerIds.has(freelancerId)) return false;
  return true;
}

function compareCandidates(a: RankedMatch, b: RankedMatch): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.geekScore !== a.geekScore) return b.geekScore - a.geekScore;
  return a.fullName.localeCompare(b.fullName);
}

export function rankFreelancersForJob(
  jobSkills: string[],
  freelancers: FreelancerCandidate[],
  bidsByFreelancer: Map<string, FreelancerBidRecord[]>,
  jobsById: Map<string, JobRecord>,
  invitedFreelancerIds: Set<string>,
  biddingFreelancerIds: Set<string>
): RankedMatch[] {
  const ranked: RankedMatch[] = [];

  for (const f of freelancers) {
    if (!isEligibleCandidate(f.id, invitedFreelancerIds, biddingFreelancerIds)) continue;

    const bids = bidsByFreelancer.get(f.id) ?? [];
    const { score, breakdown } = computeSmartMatchScore(
      f.id,
      jobSkills,
      f.skills,
      bids,
      jobsById
    );

    ranked.push({
      freelancerId: f.id,
      fullName: f.fullName,
      geekScore: f.geekScore,
      score,
      breakdown,
    });
  }

  return ranked.sort(compareCandidates);
}

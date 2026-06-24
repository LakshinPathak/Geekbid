"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import {
  Award, Clock, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Timer, Brain,
} from "lucide-react";
import Link from "next/link";

type AssessmentSummary = { id: string; skill: string; questionCount: number; timeLimit: number; passingScore: number };
type QuizQuestion = { question: string; options: string[] };
type QuizData = { id: string; skill: string; timeLimit: number; passingScore: number; questions: QuizQuestion[] };
type ResultData = { id: string; skill: string; score: number; passed: boolean; completedAt: string };

export default function AssessmentsPage() {
  const { currentUser, mounted } = useApp();
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [results, setResults] = useState<ResultData[]>([]);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const loadData = useCallback(async () => {
    const [aRes, rRes] = await Promise.all([
      fetch("/api/assessments"),
      currentUser ? fetch("/api/assessments?results=true", {
        headers: { Authorization: `Bearer ${localStorage.getItem("gb_access_token")}` },
      }) : Promise.resolve(null),
    ]);
    if (aRes.ok) setAssessments(await aRes.json());
    if (rRes?.ok) setResults(await rRes.json());
  }, [currentUser]);

  useEffect(() => { if (mounted) loadData(); }, [mounted, loadData]);

  const startQuiz = async (id: string) => {
    const res = await fetch(`/api/assessments?id=${id}`);
    if (!res.ok) { toast.error("Failed to load quiz"); return; }
    const data = await res.json();
    setQuiz(data);
    setAnswers(new Array(data.questions.length).fill(null));
    setCurrentQ(0);
    setTimeLeft(data.timeLimit);
    setStartedAt(new Date().toISOString());
    setQuizResult(null);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const token = localStorage.getItem("gb_access_token");
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assessmentId: quiz.id, answers: answers.map(a => a ?? -1), startedAt }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); setSubmitting(false); return; }
      setQuizResult({ score: data.score, passed: data.passed });
      await loadData();
    } catch { toast.error("Submit failed"); }
    setSubmitting(false);
  };

  useEffect(() => {
    if (timeLeft === 0 && quiz && !quizResult && !submitting) submitQuiz();
  }, [timeLeft]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (!mounted) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  // Quiz result screen
  if (quizResult) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-8 max-w-md text-center">
          {quizResult.passed ? (
            <CheckCircle2 className="h-16 w-16 text-[#00FF88] mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="font-heading text-2xl font-bold text-[#E8E8EC] mb-2">
            {quizResult.passed ? "Congratulations!" : "Not Quite"}
          </h2>
          <p className="font-heading text-4xl font-bold text-[#00FF88] mb-2">{quizResult.score}%</p>
          <p className="text-[#8A8A9A] text-sm mb-6">
            {quizResult.passed
              ? `You've earned the ${quiz?.skill} Verified badge and +50 GeekScore!`
              : `You need ${quiz?.passingScore}% to pass. Try again in 30 days.`}
          </p>
          <button onClick={() => { setQuiz(null); setQuizResult(null); }}
            className="bg-[#00FF88] text-[#0A0A0F] font-semibold px-6 py-3 rounded-xl hover:bg-[#00CC6A] transition-all">
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Active quiz
  if (quiz) {
    const q = quiz.questions[currentQ];
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Quiz header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading text-xl font-bold text-[#E8E8EC]">{quiz.skill} Assessment</h1>
              <p className="text-[#8A8A9A] text-sm">Question {currentQ + 1} of {quiz.questions.length}</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              timeLeft < 60 ? "border-red-500/30 text-red-400" : "border-[#1E1E2A] text-[#8A8A9A]"
            }`}>
              <Timer className="h-4 w-4" />
              <span className="font-mono text-lg font-bold">{mins}:{secs.toString().padStart(2, "0")}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="h-2 bg-[#1E1E2A] rounded-full mb-8 overflow-hidden">
            <div className="h-2 bg-[#00FF88] rounded-full transition-all" style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }} />
          </div>

          {/* Question */}
          <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8">
            <p className="text-[#E8E8EC] text-lg font-medium mb-6">{q.question}</p>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => { const a = [...answers]; a[currentQ] = i; setAnswers(a); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    answers[currentQ] === i
                      ? "border-[#00FF88] bg-[#00FF88]/5 text-[#E8E8EC]"
                      : "border-[#1E1E2A] bg-[#0A0A0F] text-[#8A8A9A] hover:border-[#8A8A9A]/30"
                  }`}>
                  <span className="font-mono text-xs text-[#55556A] mr-3">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ(currentQ - 1)}
                className="flex-1 h-11 border border-[#1E1E2A] text-[#E8E8EC] font-semibold rounded-xl text-sm hover:bg-[#12121A] transition-all flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
            )}
            {currentQ < quiz.questions.length - 1 ? (
              <button onClick={() => setCurrentQ(currentQ + 1)}
                className="flex-1 h-11 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl text-sm hover:bg-[#00CC6A] transition-all flex items-center justify-center gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={submitQuiz} disabled={submitting}
                className="flex-1 h-11 bg-[#00FF88] text-[#0A0A0F] font-bold rounded-xl text-sm hover:bg-[#00CC6A] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? "Submitting..." : "Submit Assessment"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Assessment list
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#8A8A9A] text-sm hover:text-[#00FF88] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#E8E8EC]">Skill Assessments</h1>
        <p className="text-[#8A8A9A] text-sm mt-1">Pass an assessment to earn a Verified badge and +50 GeekScore</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {assessments.map(a => {
            const myResult = results.find(r => r.skill === a.skill);
            const passed = myResult?.passed;
            return (
              <div key={a.id} className={`bg-[#12121A] border rounded-2xl p-6 ${
                passed ? "border-[#00FF88]/30" : "border-[#1E1E2A]"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-[#00FF88]" />
                    <h3 className="font-heading text-lg font-semibold text-[#E8E8EC]">{a.skill}</h3>
                  </div>
                  {passed && (
                    <span className="bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[#55556A] text-xs mb-4">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.timeLimit / 60} min</span>
                  <span>{a.questionCount} questions</span>
                  <span>Pass: {a.passingScore}%</span>
                </div>
                {myResult && (
                  <p className="text-[#8A8A9A] text-xs mb-3">
                    Last score: <span className={passed ? "text-[#00FF88]" : "text-red-400"}>{myResult.score}%</span>
                  </p>
                )}
                <button onClick={() => startQuiz(a.id)}
                  disabled={!!myResult && new Date(myResult.completedAt).getTime() > Date.now() - 30 * 24 * 3600000}
                  className="w-full py-2.5 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl text-sm hover:bg-[#00CC6A] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {passed ? "Retake" : myResult ? "Retry" : "Start Assessment"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

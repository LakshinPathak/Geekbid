"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney, SKILL_TAXONOMY } from "@/lib/utils";
import { toast } from "sonner";
import { PlusCircle, ArrowRight, ArrowLeft, Check, Zap, DollarSign, Clock, Target } from "lucide-react";

type Step = 1 | 2 | 3;

const STEP_META = [
  { num: 1, label: "Details", icon: PlusCircle },
  { num: 2, label: "Pricing", icon: DollarSign },
  { num: 3, label: "Review", icon: Check },
];

export default function PostJobPage() {
  const { postJob, currentUser, mounted } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [startingPrice, setStartingPrice] = useState(1000);
  const [minimumPrice, setMinimumPrice] = useState(400);
  const [decayRate, setDecayRate] = useState(15);
  const [estimatedHours, setEstimatedHours] = useState(20);
  const [deadline, setDeadline] = useState(48);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const onSubmit = async () => {
    const r = await postJob({
      title, description, skillsRequired: skills,
      startingPrice, minimumPrice, decayRatePerHour: decayRate,
      estimatedHours,
      deadlineAt: new Date(Date.now() + deadline * 3600000).toISOString(),
    });
    if (r.ok) {
      toast.success("Job posted!", { description: r.message });
      router.push("/feed");
    } else {
      toast.error("Error", { description: r.message });
    }
  };

  if (!mounted) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
          <PlusCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black">Post a Job</h1>
          <p className="text-xs text-neutral-400">Create a reverse auction for your project</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEP_META.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <button onClick={() => setStep(s.num as Step)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                step >= s.num ? "bg-black text-white" : "bg-neutral-100 text-neutral-400"
              }`}>
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </button>
            {i < 2 && <div className={`flex-1 h-px mx-2 ${step > s.num ? "bg-black" : "bg-neutral-200"}`} />}
          </div>
        ))}
      </div>

      <Card className="border-neutral-200">
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Job Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Build a React Dashboard" className="mt-1.5 h-11 rounded-xl bg-neutral-50 border-neutral-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the project requirements..." rows={4} className="mt-1.5 rounded-xl bg-neutral-50 border-neutral-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Required Skills</Label>
                <ScrollArea className="max-h-[200px]">
                  <div className="flex flex-wrap gap-2">
                    {SKILL_TAXONOMY.map(s => (
                      <Badge key={s} variant={skills.includes(s) ? "default" : "outline"}
                        className={`cursor-pointer text-xs rounded-lg py-1.5 px-3 transition-all ${skills.includes(s) ? "bg-black text-white hover:bg-neutral-800" : "hover:bg-neutral-50 text-neutral-600"}`}
                        onClick={() => toggleSkill(s)}>{s}</Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <Separator />
              <Button className="w-full bg-black hover:bg-neutral-800 text-white rounded-xl h-11" onClick={() => setStep(2)} disabled={!title.trim()}>
                Next: Pricing <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Starting Price ($)</Label>
                  <Input type="number" value={startingPrice} onChange={e => setStartingPrice(Number(e.target.value))} className="mt-1.5 h-11 rounded-xl bg-neutral-50 border-neutral-200" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Floor Price ($)</Label>
                  <Input type="number" value={minimumPrice} onChange={e => setMinimumPrice(Number(e.target.value))} className="mt-1.5 h-11 rounded-xl bg-neutral-50 border-neutral-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Decay Rate ($/hr)</Label>
                  <Input type="number" value={decayRate} onChange={e => setDecayRate(Number(e.target.value))} className="mt-1.5 h-11 rounded-xl bg-neutral-50 border-neutral-200" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Est. Hours</Label>
                  <Input type="number" value={estimatedHours} onChange={e => setEstimatedHours(Number(e.target.value))} className="mt-1.5 h-11 rounded-xl bg-neutral-50 border-neutral-200" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Deadline (hours from now)</Label>
                <Input type="number" value={deadline} onChange={e => setDeadline(Number(e.target.value))} className="mt-1.5 h-11 rounded-xl bg-neutral-50 border-neutral-200" />
              </div>

              {/* Preview card */}
              <Card className="bg-neutral-50 border-neutral-200">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-neutral-500 mb-2">Pricing Preview</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Start → Floor</span>
                    <span className="font-bold text-black">{formatMoney(startingPrice)} → {formatMoney(minimumPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-neutral-400">Time to floor</span>
                    <span className="font-bold text-black">{decayRate > 0 ? `${((startingPrice - minimumPrice) / decayRate).toFixed(1)}h` : "∞"}</span>
                  </div>
                </CardContent>
              </Card>

              <Separator />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11 border-neutral-200" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1 bg-black hover:bg-neutral-800 text-white rounded-xl h-11" onClick={() => setStep(3)}>
                  Review <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Title</p>
                  <p className="text-sm font-semibold text-black mt-0.5">{title || "Untitled"}</p>
                </div>
                <Separator className="bg-neutral-100" />
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Description</p>
                  <p className="text-sm text-neutral-600 mt-0.5">{description || "No description"}</p>
                </div>
                <Separator className="bg-neutral-100" />
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => <Badge key={s} variant="outline" className="text-xs rounded-lg py-1 px-2.5 border-neutral-200">{s}</Badge>)}
                    {skills.length === 0 && <span className="text-xs text-neutral-400">None selected</span>}
                  </div>
                </div>
                <Separator className="bg-neutral-100" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 rounded-xl p-3"><p className="text-[10px] text-neutral-400 uppercase">Starting</p><p className="text-lg font-bold">{formatMoney(startingPrice)}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-3"><p className="text-[10px] text-neutral-400 uppercase">Floor</p><p className="text-lg font-bold">{formatMoney(minimumPrice)}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-3"><p className="text-[10px] text-neutral-400 uppercase">Decay</p><p className="text-lg font-bold">${decayRate}/hr</p></div>
                  <div className="bg-neutral-50 rounded-xl p-3"><p className="text-[10px] text-neutral-400 uppercase">Est. Hours</p><p className="text-lg font-bold">{estimatedHours}h</p></div>
                </div>
              </div>

              <Separator />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11 border-neutral-200" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1 bg-black hover:bg-neutral-800 text-white rounded-xl h-12 font-bold" onClick={onSubmit}>
                  <Zap className="mr-2 h-4 w-4" /> Post Job
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET /api/jobs/pricing-hint?skills=React,Node.js
export async function GET(req: NextRequest) {
 try {
 const { searchParams } = new URL(req.url);
 const skillsParam = searchParams.get("skills");

 if (!skillsParam) {
 return NextResponse.json({ error: "skills parameter required" }, { status: 400 });
 }

 const skills = skillsParam.split(",").map((s) => s.trim()).filter(Boolean);
 if (skills.length === 0) {
 return NextResponse.json({ error: "At least one skill required" }, { status: 400 });
 }

 const db = await getDb();

 const pipeline = [
 {
 $match: {
 status: "accepted",
 skillsRequired: { $in: skills },
 finalPrice: { $gt: 0 },
 },
 },
 {
 $group: {
 _id: null,
 avgFinalPrice: { $avg: "$finalPrice" },
 minPrice: { $min: "$finalPrice" },
 maxPrice: { $max: "$finalPrice" },
 avgDecayRate: { $avg: "$decayRatePerHour" },
 avgEstimatedHours: { $avg: "$estimatedHours" },
 count: { $sum: 1 },
 },
 },
 ];

 const results = await db.collection("jobs").aggregate(pipeline).toArray();

 if (results.length === 0 || results[0].count === 0) {
 return NextResponse.json({
 available: false,
 message: "No historical data for these skills yet",
 });
 }

 const data = results[0];
 return NextResponse.json({
 available: true,
 avgFinalPrice: Math.round(data.avgFinalPrice),
 minPrice: Math.round(data.minPrice),
 maxPrice: Math.round(data.maxPrice),
 avgDecayRate: Math.round(data.avgDecayRate),
 avgEstimatedHours: Math.round(data.avgEstimatedHours),
 sampleSize: data.count,
 });
 } catch (err) {
 console.error("[Pricing Hint Error]", err);
 return NextResponse.json({ error: "Failed to fetch pricing hint" }, { status: 500 });
 }
}

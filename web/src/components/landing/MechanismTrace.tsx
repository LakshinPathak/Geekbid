"use client";

import { useInView, useReducedMotion } from "./hooks";

const STATIONS = [
  { label: "Post", x: 100, y: 20, anchor: "middle" as const, dy: -14 },
  { label: "Decay", x: 500, y: 20, anchor: "middle" as const, dy: -14 },
  { label: "Bid", x: 580, y: 80, anchor: "start" as const, dy: 4, dx: 14 },
  { label: "Accept", x: 300, y: 140, anchor: "middle" as const, dy: 26 },
  { label: "Escrow", x: 20, y: 80, anchor: "end" as const, dy: 4, dx: -14 },
];

const LOOP_PATH =
  "M 60 20 H 540 A 40 40 0 0 1 580 60 V 100 A 40 40 0 0 1 540 140 H 60 A 40 40 0 0 1 20 100 V 60 A 40 40 0 0 1 60 20 Z";

/* Phase 1 "burst": one fast pass around the loop, ~1.6s, flashing each
   station in strict sequence as the token reaches it — a literal
   single-pass state trace. Phase 2 "idle": the token settles into a
   slow, dim, perpetual repeat while nodes rest at 0.4 opacity — "the
   engine still runs, just quietly." */
const BURST_DUR_S = 1.6;
const IDLE_DUR_S = 6;

/** Post -> Decay -> Bid -> Accept -> Escrow as a closed-loop diagram —
 *  a two-phase state machine, not a single ambient loop: it runs once
 *  fast and bright on view-entry (each node lighting in strict
 *  sequence as the token passes), then settles into a slow, dim,
 *  perpetual idle repeat — deliberately not gated to further
 *  scroll/interaction, so this section reads as "the engine runs
 *  whether you're watching or not." */
export default function MechanismTrace() {
  const section = useInView(0.2);
  const reducedMotion = useReducedMotion();
  const drawn = reducedMotion || section.inView;

  return (
    <section ref={section.ref} className="py-20 sm:py-28 bg-[#1b1523] overflow-hidden">
      <div className="mx-auto max-w-[820px] px-5 sm:px-8 text-center">
        <p
          className="landing-label text-[#a78bfa]"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          The mechanism
        </p>
        <h2
          className="landing-h2 text-3xl sm:text-5xl text-[#f3effa] mt-3 text-balance"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 80ms, transform 0.6s ease 80ms",
          }}
        >
          Five stations, running continuously
        </h2>
        <p
          className="landing-subhead text-base sm:text-lg text-[#b8aed1] mt-5 max-w-lg mx-auto"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 150ms, transform 0.6s ease 150ms",
          }}
        >
          Every job on GeekBid moves through the same loop, whether or not
          anyone's watching it happen.
        </p>
      </div>

      <div
        className="mx-auto max-w-[700px] px-5 sm:px-8 mt-14"
        style={{
          opacity: section.inView ? 1 : 0,
          transition: "opacity 0.8s ease 250ms",
        }}
      >
        <svg viewBox="-40 -20 680 200" className="w-full h-auto" role="img" aria-label="Post, Decay, Bid, Accept, Escrow loop diagram">
          <path
            d={LOOP_PATH}
            fill="none"
            stroke="rgba(167,139,250,0.16)"
            strokeWidth="1.5"
          />
          <path
            d={LOOP_PATH}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            pathLength={100}
            style={{
              strokeDasharray: 100,
              strokeDashoffset: drawn ? 0 : 100,
              transition: reducedMotion ? "none" : "stroke-dashoffset 1.5s cubic-bezier(0.2, 0.78, 0.2, 1)",
            }}
          />

          {!reducedMotion && drawn && (
            <>
              {/* Phase 1: one fast, bright pass — begins the instant the
                  loop finishes drawing (SMIL begin is relative to this
                  element's own mount time since it's only rendered once
                  `drawn` is true). */}
              <circle r="5.5" fill="#a78bfa">
                <animateMotion
                  path={LOOP_PATH}
                  dur={`${BURST_DUR_S}s`}
                  begin="0s"
                  repeatCount="1"
                  rotate="auto"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="1;1;0"
                  keyTimes="0;0.9;1"
                  dur={`${BURST_DUR_S}s`}
                  begin="0s"
                  repeatCount="1"
                  fill="freeze"
                />
              </circle>
              {/* Phase 2: slow, dim, perpetual idle repeat — starts right
                  as the burst pass ends. */}
              <circle r="4" fill="#a78bfa" opacity="0.4">
                <animateMotion
                  path={LOOP_PATH}
                  dur={`${IDLE_DUR_S}s`}
                  begin={`${BURST_DUR_S}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </>
          )}

          {STATIONS.map((s, i) => (
            <g key={s.label}>
              <circle
                cx={s.x}
                cy={s.y}
                r="6"
                fill="#1b1523"
                stroke="#a78bfa"
                strokeWidth="1.5"
                className={
                  reducedMotion || !drawn
                    ? undefined
                    : "landing-mech-node-burst landing-mech-node-idle"
                }
                style={{
                  opacity: reducedMotion || !drawn ? 1 : undefined,
                  animationDelay:
                    reducedMotion || !drawn
                      ? undefined
                      : `${(i / STATIONS.length) * BURST_DUR_S}s, ${BURST_DUR_S}s`,
                }}
              />
              <text
                x={s.x + (s.dx ?? 0)}
                y={s.y + s.dy}
                textAnchor={s.anchor}
                fill="#e7e1f5"
                fontSize="13"
                fontFamily="var(--font-jakarta), system-ui, sans-serif"
                fontWeight={500}
              >
                {s.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

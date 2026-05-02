import { motion } from "framer-motion";
import { POWERLIFTING_PRS, powerlifting } from "../../config/content";
import { Panel } from "./Panel";

export function PowerliftingPanel() {
  return (
    <Panel title="POWERLIFTING">
      <p className="text-white/70 mb-6">
        Strength is a compounding investment. Train hard, recover harder.
      </p>

      {/* Bodyweight — framed as the weight-class context for the lifts below */}
      <div className="pb-5 mb-5 border-b border-yellow-500/20">
        <div className="text-gold/70 text-xs uppercase tracking-widest mb-1">
          Bodyweight
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-display text-3xl tracking-wider">
            {powerlifting.bodyweight.value}
          </span>
          <span className="text-gold/80 font-display text-lg">
            {powerlifting.bodyweight.unit}
          </span>
        </div>
      </div>

      {/* Lift PRs */}
      <div className="space-y-4">
        {POWERLIFTING_PRS.map((pr, i) => (
          <motion.div
            key={pr.lift}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="rounded-lg border border-gold/30 p-5 bg-gradient-to-br from-white/5 to-transparent"
          >
            <div className="text-gold/70 text-xs uppercase tracking-widest mb-1">
              {pr.lift}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-display text-4xl tracking-wider">
                {pr.weight}
              </span>
              <span className="text-gold/80 font-display text-lg">{pr.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

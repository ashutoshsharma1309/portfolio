import { CONTACT_EMAIL, SOCIAL_LINKS } from "../../config/links";
import { Panel } from "./Panel";

export function WhiteboardPanel() {
  return (
    <Panel title="WHITEBOARD">
      <div
        className="rounded-lg bg-white p-6 leading-tight"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        <div className="text-red-600 text-3xl text-center mb-5">HELLO!</div>

        <div className="mb-5">
          <div className="text-blue-700 text-xl">Contact</div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-green-700 text-base hover:underline break-all"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <div>
          <div className="text-blue-700 text-xl">Projects</div>
          <a
            href={SOCIAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 text-base hover:underline break-all"
          >
            github.com/ashutoshsharma1309
          </a>
        </div>
      </div>
      <p className="text-white/70 mt-6 text-sm leading-relaxed">
        Tap the four photo frames on the wall to jump to GitHub, LinkedIn,
        LeetCode, and Codeforces. Or use the top nav.
      </p>
    </Panel>
  );
}

import { useState } from "react";

// The whole first-run flow holds exactly three user decisions:
//   task (S3) · didStep (S5) · checkins (S7)
// firstStep is derived from the Shrinker, not a decision. Nothing else lives here.
export type OnboardingState = {
  task: string;
  firstStep: string;
  didStep: boolean;
  checkins: boolean;
};

export function useOnboardingState() {
  const [task, setTask] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [didStep, setDidStep] = useState(false);
  const [checkins, setCheckins] = useState(false);
  return { task, setTask, firstStep, setFirstStep, didStep, setDidStep, checkins, setCheckins };
}

export type OnboardingStore = ReturnType<typeof useOnboardingState>;

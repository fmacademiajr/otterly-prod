// Onboarding copy. Final and approved — do not edit inline in screens.
// A Taglish locale set can be added beside this without touching components.

export const strings = {
  s1: {
    kicker: "Otterly",
    headline: "Can't start? You're not broken.",
    support: "Stress takes your planning brain offline. Otterly holds the plan for you.",
    button: "Okay",
  },
  s2: {
    kicker: "One breath first",
    support: "Ten seconds. Long, slow exhale.",
    inhale: "Breathe in",
    exhale: "Let it go slowly",
    reduced: "Breathe slowly",
    skip: "Skip",
  },
  s3: {
    headline: "What's the one thing you can't start?",
    support: "Type it or say it. Your words are enough.",
    placeholder: "reply to that email",
    mic: "Hold to say it out loud",
    button: "Okay",
    // Stall path: after 20s idle with an empty field, one tappable pill appears.
    stallPill: 'that one is fine: "reply to that email"',
    stallTask: "reply to that email",
  },
  s4: {
    stepLabel: "First step",
    support: "I'm holding the rest. You only ever see one thing.",
    fallbackStep: "Stand up.",
    button: "Okay",
  },
  s5: {
    stepLabel: "Your step",
    headline: "I'll sit with you while you do it.",
    support: "No timer. No watching. Tap Done whenever you get back.",
    done: "Done",
    notNow: "Not now",
  },
  s6: {
    done: {
      headline: "That counts.",
      support: "You started. That was the hard part.",
    },
    notNow: {
      headline: "Still here. That counts.",
      support: "The step will wait.",
    },
    button: "Okay",
  },
  s7: {
    headline: "No lists. No badges. No nagging.",
    support: "Want me to check in gently sometimes? Either answer is right.",
    yes: "Check in gently",
    no: "Stay quiet",
  },
} as const;

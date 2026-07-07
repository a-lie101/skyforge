/* =========================================================================
   SKY FORGE — DEMO DATA
   =========================================================================
   Everything shown in the pilot-side demo lives in this one file.
   Edit the values below and refresh the page — no other file needs changing.

   Contents:
     1. partnerName / expectedResponseText — small bits of copy
     2. partnerCodes — DHL access codes accepted on the eligibility gate
     3. pilots      — demo pilot logins (case access code + passphrase)
                      and the seeded cases that appear in their inbox

   Case "status" must be one of:
     "submitted" | "under_review" | "response_available"
     | "more_info_requested" | "closed"
   Case "riskFlag" must be one of: "routine" | "elevated" | "urgent"
   ========================================================================= */

window.SKYFORGE_DEMO = {

  /* 1 ─ Copy ------------------------------------------------------------ */
  partnerName: "DHL",
  expectedResponseText: "within 3 working days",

  /* 2 ─ Partner access codes (DHL eligibility gate) ---------------------- */
  /* "reusable: true" codes can be redeemed any number of times (demo only).
     One-time codes are burned after a pilot creates their case credential. */
  partnerCodes: [
    { code: "DHL-DEMO", reusable: true,  note: "Master demo code — reusable." },
    { code: "DHL-4F7K", reusable: false, note: "One-time invite code." },
    { code: "DHL-8Q2M", reusable: false, note: "One-time invite code." },
    { code: "DHL-P3XR", reusable: false, note: "One-time invite code." }
  ],

  /* 3 ─ Demo pilot logins ------------------------------------------------ */
  pilots: [
    {
      /* Pilot with a populated inbox — worked demo cases A & B from the
         brief (§11), plus one case still in the review queue. */
      accessCode: "SF-DEMO-PILOT",
      passphrase: "bluesky",
      cases: [
        {
          id: "SF-2417",
          submittedAt: "2026-06-02",
          status: "closed",
          riskFlag: "routine",
          intake: {
            emergency: "No",
            categories: ["Fatigue / sleep", "Isolation / loneliness"],
            concernText:
              "I have been feeling exhausted after a difficult roster period. " +
              "I am sleeping badly after night flights and feel disconnected " +
              "from friends and family. I am not in immediate danger and I am " +
              "not thinking about harming myself. I mainly want to understand " +
              "whether this is normal and what steps I can take before it gets worse.",
            duration: "2–4 weeks",
            severity: 5,
            impact: ["Sleep", "Relationships"],
            sleep: "Broken sleep after night flights; rarely feel rested.",
            substance: "No",
            physical: "",
            preferred: ["Resources", "Clinical-reviewed guidance"]
          },
          response: {
            respondedAt: "2026-06-05",
            type: "Resource guidance",
            text:
              "Thank you for sharing this. What you describe can happen during " +
              "periods of irregular sleep and roster disruption, but it is still " +
              "worth addressing early. Sky Forge cannot diagnose or treat, but " +
              "the following steps may help you decide what support to seek. " +
              "Consider tracking sleep for one week, reducing alcohol and " +
              "caffeine close to rest periods, and speaking to a qualified " +
              "healthcare professional if symptoms persist or worsen. If you " +
              "feel unsafe at any point, seek urgent medical help.",
            resources: [
              "Fatigue management guide",
              "Sleep hygiene guide",
              "Contact pathway for non-urgent wellbeing support"
            ]
          }
        },
        {
          id: "SF-2483",
          submittedAt: "2026-06-21",
          status: "response_available",
          riskFlag: "elevated",
          intake: {
            emergency: "No",
            categories: ["Alcohol / substance concern", "Stress / anxiety"],
            concernText:
              "I am worried I have started drinking too much after flights and " +
              "on days off. It has become a way to switch off. I do not feel " +
              "like I am in immediate danger, but I am worried it is getting " +
              "out of control and I do not want this to affect my career.",
            duration: "1–3 months",
            severity: 7,
            impact: ["Sleep", "Mood", "Relationships"],
            sleep: "Sleep is irregular; often poor after drinking.",
            substance: "Yes — alcohol",
            physical: "",
            preferred: ["Referral information", "Clinical-reviewed guidance"]
          },
          response: {
            respondedAt: "2026-06-24",
            type: "Referral guidance",
            text:
              "Thank you for being direct about this. Sky Forge cannot diagnose " +
              "or treat alcohol-related conditions, and this response is not a " +
              "licensing decision. Based on what you have described, we " +
              "recommend speaking with a qualified healthcare professional or " +
              "appropriate support service for confidential assessment and " +
              "guidance. If you feel at risk of harming yourself or others, or " +
              "if you are unable to stay safe, please seek urgent medical help " +
              "immediately. Suggested next step: contact the approved " +
              "healthcare pathway for a confidential appointment.",
            resources: [
              "Alcohol support resources",
              "Stress support guide",
              "What to expect when seeking professional help"
            ]
          }
        },
        {
          id: "SF-2511",
          submittedAt: "2026-07-04",
          status: "under_review",
          riskFlag: "routine",
          intake: {
            emergency: "No",
            categories: ["Roster / work pressure"],
            concernText:
              "Recent roster changes have made it hard to keep any routine. " +
              "I am managing, but I would like some guidance on coping with " +
              "the constant schedule disruption before it wears me down.",
            duration: "1–2 weeks",
            severity: 4,
            impact: ["Sleep", "Daily routines"],
            sleep: "Inconsistent — depends on the pairing.",
            substance: "No",
            physical: "",
            preferred: ["Resources"]
          },
          response: null
        }
      ]
    },
    {
      /* Pilot with an empty inbox — useful for showing the first-report flow. */
      accessCode: "SF-NEW-PILOT",
      passphrase: "cirrus",
      cases: []
    }
  ]
};

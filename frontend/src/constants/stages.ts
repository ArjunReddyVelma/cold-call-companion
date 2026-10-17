import { StageDefinition, CallOutcome } from '../types/call';

export const DEFAULT_STAGES: StageDefinition[] = [
  {
    stage_number: 1,
    name: 'Opening',
    purpose: 'Reach the right person and say who you are. The prospect decides in the first ten seconds whether this call is worth a minute.',
    likely_responses: [
      '“Speaking. Who is this, and where are you calling from?” (T046, T088)',
      '“Sir is in a meeting. Please call back after 3 PM or send an email.” (T027, T044)',
      '“You have reached the wrong person. Mr. Dilip no longer handles this.” (T004, T025)'
    ],
    quick_tap_options: [
      'Reached intended person',
      'Reception / gatekeeper',
      'Busy / unavailable',
      'Wrong person / moved company'
    ]
  },
  {
    stage_number: 2,
    name: 'Purpose',
    purpose: 'Say in one or two sentences why you called, in words the prospect can repeat to a colleague.',
    likely_responses: [
      '“What do you guys actually do? Are you a consulting firm or an agency?” (T063, T084)',
      '“Where did you get my contact number from? Who gave you this?” (T063, T081)',
      '“What does a growth report mean? Is this a sales pitch or do you charge?” (T012, T063)'
    ],
    quick_tap_options: [
      'Asked what we do',
      'Asked where number was obtained',
      'Challenged as sales pitch / cost',
      'Understood / allowed to continue'
    ]
  },
  {
    stage_number: 3,
    name: 'Permission',
    purpose: 'Find out whether they are willing to talk now. A clear yes, a clear no, or a time to call back are all good outcomes.',
    likely_responses: [
      '“Yes, please proceed. Tell me briefly.” (T008, T046)',
      '“I am in the middle of something. Can you call me back tomorrow around 11?” (T002, T014)',
      '“Send an introductory note on WhatsApp first, then we can talk.” (T056, T063)'
    ],
    quick_tap_options: [
      'Agreed to talk now',
      'Callback time requested',
      'Send info first (WhatsApp/Email)',
      'Declined / not now'
    ]
  },
  {
    stage_number: 4,
    name: 'Their business',
    purpose: 'Ask about their company and their work before saying anything about yours. People talk about what they do.',
    likely_responses: [
      '“We are a manufacturing unit. We make outdoor lighting housings.” (T082, T084)',
      '“We do not have an R&D team. We are contract manufacturing only.” (T081, T088)',
      '“Why are you asking about our plans? Tell me about your company first.” (T077, T092)'
    ],
    quick_tap_options: [
      'Shared business context',
      'Corrected company / role assumption',
      'Asked caller to explain first',
      'Guarded / declined to share details'
    ]
  },
  {
    stage_number: 5,
    name: 'Their need, in their words',
    purpose: 'Hear what they are trying to do or struggling with, in their own words. The caller writes down exactly what was said.',
    likely_responses: [
      '“Our challenge is applying software and scientific execution to a factory floor.” (T084)',
      '“Thankfully we are on the right track. We have robust internal processes.” (T058, T082)',
      '“Revenue increases only when a customer is onboarded. How does your process do that?” (T094)'
    ],
    quick_tap_options: [
      'Named specific growth/operational need',
      'No current need / operations stable',
      'Questioned applicability to their sector',
      'No clear need articulated'
    ]
  },
  {
    stage_number: 6,
    name: 'Objection',
    purpose: 'Hear the reason for a no and understand it. A reason you understand can be answered on this call or the next.',
    likely_responses: [
      '“Honestly, we already engaged a consultant last month for this exact work.” (T077, T092)',
      '“Because we are an MNC, these assessment agencies are engaged at global HQ.” (T041, T088)',
      '“There is a clear mismatch between what you offer and what we do as a manufacturer.” (T012, T094)'
    ],
    quick_tap_options: [
      'Existing consultant / in-house team',
      'Corporate / Head Office decision',
      'Mismatch / no requirement',
      'Brush-off (send email to dismiss)'
    ]
  },
  {
    stage_number: 7,
    name: 'Next step',
    purpose: 'Agree one concrete thing: a document on WhatsApp or email, a call at a named time, a meeting.',
    likely_responses: [
      '“Send the report on WhatsApp to my direct number, and I will review it.” (T046, T082)',
      '“Call me next Thursday around 10:30 AM after I look through the report.” (T008, T046)',
      '“Send an introductory profile to our official email and we will contact you if relevant.” (T063, T091)'
    ],
    quick_tap_options: [
      'Agreed to report via WhatsApp',
      'Agreed to report via Email',
      'Scheduled follow-up call / meeting',
      'Referral / alternate contact given'
    ]
  },
  {
    stage_number: 8,
    name: 'Close',
    purpose: 'End the call clearly and record what happened: the outcome, the next step, and the prospect\'s words from stage 5.',
    likely_responses: [
      '“All right, send it over WhatsApp and we will talk next Thursday at 10:30.” (T046, T082)',
      '“Theek hai, aap bhejiye, and we will get back if it sounds relevant. Thank you.” (T094)',
      '“Hello? Actually your voice is not proper... [Call disconnected].” (T016, T068)'
    ],
    quick_tap_options: [
      'Confirmed concrete next step',
      'Polite brush-off / no commitment',
      'Abrupt disconnect / dropped line',
      'Caller logged mismatch noted'
    ]
  }
];

export interface OutcomeMeta {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const OUTCOME_META: Record<CallOutcome, OutcomeMeta> = {
  next_step_agreed: {
    label: 'Next step agreed',
    description: 'Meeting, scheduled callback time, or report + confirmed follow-up discussion',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  agreed_to_receive_report: {
    label: 'Agreed to receive report',
    description: 'Prospect agreed to receive research profile on WhatsApp or Email',
    color: '#0284C7',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD'
  },
  interested: {
    label: 'Interested (verbal)',
    description: 'Positive verbal interest expressed, but no fixed time or deliverable scheduled',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE'
  },
  follow_up: {
    label: 'Follow up needed',
    description: 'Prospect requested a callback (busy, in a meeting, driving)',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  call_again: {
    label: 'Call again (line/language)',
    description: 'Interrupted by poor audio quality, line drop, or language preference',
    color: '#0D9488',
    bgColor: '#F0FDFA',
    borderColor: '#99F6E4'
  },
  not_interested: {
    label: 'Not interested',
    description: 'Prospect explicitly declined the service proposition',
    color: '#4B5563',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB'
  },
  do_not_call: {
    label: 'Do not call',
    description: 'Prospect demanded immediate removal from call list or harsh refusal',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  wrong_person: {
    label: 'Wrong person',
    description: 'Reached someone who does not handle this function or wrong contact',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FFEDD5'
  },
  moved_company: {
    label: 'Moved company',
    description: 'Target individual no longer works at the organization',
    color: '#DB2777',
    bgColor: '#FDF2F8',
    borderColor: '#FBCFE8'
  },
  not_logged: {
    label: 'Not logged / Incomplete',
    description: 'Call ended prematurely without a designated outcome',
    color: '#64748B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0'
  }
};

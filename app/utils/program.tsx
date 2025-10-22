// Defines the allowed program types
export enum ProgramType {
  Fitness = "fitness",
  Nutrition = "nutrition",
  Cognition = "cognition",
  Clinical = "clinical",
  Mental = "mental",
  Identity = "identity",
  Sleep = "sleep",
  Training = "training",
}

export function mapPlanTypeToProgramType(planType: string): ProgramType {
  const normalized = planType.toLowerCase();

  if (normalized.includes("train") || normalized.includes("fitness"))
    return ProgramType.Training;
  if (normalized.includes("nutrition") || normalized.includes("diet"))
    return ProgramType.Nutrition;
  if (normalized.includes("cogn") || normalized.includes("focus"))
    return ProgramType.Cognition;
  if (normalized.includes("clinical") || normalized.includes("rehab"))
    return ProgramType.Clinical;
  if (normalized.includes("mind") || normalized.includes("mental"))
    return ProgramType.Mental;
  if (normalized.includes("identity")) return ProgramType.Identity;
  if (normalized.includes("sleep")) return ProgramType.Sleep;
  if (normalized.includes("body") || normalized.includes("physical"))
    return ProgramType.Fitness;

  // Default fallback
  return ProgramType.Training;
}

// Defines when the program is scheduled
export enum ProgramSchedule {
  Today = "today",
  ThisWeek = "this_week",
  NextWeek = "next_week",
}

export class Program {
  constructor(
    public type: ProgramType,
    public title: string,
    public schedule: ProgramSchedule,
    public content: string // markdown text
  ) {}
}

// export class FitnessProgram extends Program {
//   constructor(title: string, schedule: ProgramSchedule, content: string) {
//     super(ProgramType.Fitness, title, schedule, content);
//   }
// }

// export class NutritionProgram extends Program {
//   constructor(title: string, schedule: ProgramSchedule, content: string) {
//     super(ProgramType.Nutrition, title, schedule, content);
//   }
// }

// export class CognitionProgram extends Program {
//   constructor(title: string, schedule: ProgramSchedule, content: string) {
//     super(ProgramType.Cognition, title, schedule, content);
//   }
// }

// export class ClinicalProgram extends Program {
//   constructor(title: string, schedule: ProgramSchedule, content: string) {
//     super(ProgramType.Clinical, title, schedule, content);
//   }
// }

// export class MentalProgram extends Program {
//   constructor(title: string, schedule: ProgramSchedule, content: string) {
//     super(ProgramType.Mental, title, schedule, content);
//   }
// }

// export class IdentityProgram extends Program {
//   constructor(title: string, schedule: ProgramSchedule, content: string) {
//     super(ProgramType.Identity, title, schedule, content);
//   }
// }

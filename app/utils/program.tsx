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

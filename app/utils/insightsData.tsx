// src/models/InsightsData.ts

export class InsightObservation {
  cognition: string;
  identity: string;
  mind: string;
  clinical: string;
  nutrition: string;
  training: string;
  body: string;
  sleep: string;

  constructor(data: any = {}) {
    this.cognition = data.cognition || "";
    this.identity = data.identity || "";
    this.mind = data.mind || "";
    this.clinical = data.clinical || "";
    this.nutrition = data.nutrition || "";
    this.training = data.training || "";
    this.body = data.body || "";
    this.sleep = data.sleep || "";
  }
}

export class NextAction {
  title: string;
  text: string;

  constructor(data: any = {}) {
    this.title = data.title || "";
    this.text = data.text || "";
  }
}

export class Insights {
  observations: InsightObservation;
  nextActions: NextAction[];
  reveal: string;

  constructor(data: any = {}) {
    this.observations = new InsightObservation(data.observations || {});
    this.nextActions = Array.isArray(data.nextActions)
      ? data.nextActions.map((item: any) => new NextAction(item))
      : [];
    this.reveal = data.reveal || "";
  }
}

export class InsightsData {
  insights: Insights;
  source: string;
  message: string;

  constructor(data: any = {}) {
    this.insights = new Insights(data.insights || {});
    this.source = data.source || "";
    this.message = data.message || "";
  }

  static fromJson(json: any): InsightsData {
    return new InsightsData(json);
  }
}

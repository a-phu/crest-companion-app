// Represents each next action item
class NextAction {
  title: string;
  text: string;

  constructor(data: { title: string; text: string }) {
    this.title = data.title;
    this.text = data.text;
  }
}

// Represents the observations section
class Observations {
  body: string;
  mind: string;
  identity: string;
  training: string;
  cognition: string;
  nutrition: string;
  sleep: string;
  clinical: string;

  constructor(data: any = {}) {
    // 👈 default to empty object
    this.body = data.body || "";
    this.mind = data.mind || "";
    this.identity = data.identity || "";
    this.training = data.training || "";
    this.cognition = data.cognition || "";
    this.nutrition = data.nutrition || "";
    this.sleep = data.sleep || "";
    this.clinical = data.clinical || "";
  }
}

// Root class mapping the entire JSON
export default class Insight {
  reveal: string;
  nextActions: NextAction[];
  observations: Observations;

  constructor(data: any) {
    this.reveal = data.reveal || "";
    this.nextActions = (data.nextActions || []).map(
      (item: any) => new NextAction(item)
    );
    this.observations = new Observations(data.observations);
  }
}

// Example usage:
const jsonData = {
  reveal:
    "You've shown a remarkable ability to set and pursue multiple goals simultaneously, which speaks to your determination and resilience. By focusing on both your physical fitness and personal development, you're creating a well-rounded approach to wellness that will serve you well in the long run. Keep pushing forward; you're on the path to achieving great things!",
  nextActions: [
    {
      text: "Start a food journal to monitor your eating habits and ensure you're fueling your body properly for your training and weight loss goals.",
      title: "Track Your Nutrition",
    },
    {
      text: "Dedicate some time each week to explore a new skill that excites you; this will not only enrich your life but also keep you motivated on your wellness journey.",
      title: "Explore a New Skill",
    },
  ],
  observations: {
    body: "You're becoming more aware of your physical capabilities and how to push your limits, which is empowering and will help you achieve your fitness goals.",
    mind: "It's great to see you balancing your fitness goals with a desire for personal development, which can help reduce stress and enhance your overall well-being.",
    identity:
      "Your desire to learn a new skill while losing weight reflects your dedication to self-improvement and living a healthier lifestyle.",
    training:
      "You're taking proactive steps to enhance your physical fitness through a structured training plan, which is an excellent way to boost your endurance and performance.",
    cognition:
      "You have a clear focus on improving your VO2 max and learning new skills, which shows your commitment to personal growth and fitness.",
    nutrition:
      "Consider tracking your nutrition to support your weight loss goals; fueling your body with the right foods will complement your training efforts.",
    sleep:
      "Sleep patterns weren't discussed, but prioritizing rest will be key to supporting your training and weight loss efforts.",
    clinical:
      "Make sure to take all required medication as prescribed by your doctor if applicable",
  },
};

// Instantiate the class
// const insight = new Insight(jsonData);
// console.log(insight);

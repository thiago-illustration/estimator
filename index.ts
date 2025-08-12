#!/usr/bin/env bun

import { input, select, confirm } from "@inquirer/prompts";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

// Fibonacci numbers we use for rounding
const FIB_NUMS = [1, 2, 3, 5, 8] as const;

type Category = "Backend" | "Frontend" | "Design";

type EstimateFactors = {
  uncertainty: number;
  complexity: number;
  testability: number;
  legacyImpact: number;
  integrationDifficulty: number;
  refactorEffort: number;
  dependencies: number;
  requirementVolatility: number;
};

type EstimateFactorNotes = {
  uncertainty: string;
  complexity: string;
  testability: string;
  legacyImpact: string;
  integrationDifficulty: string;
  refactorEffort: string;
  dependencies: string;
  requirementVolatility: string;
};

type Task = {
  name: string;
  category: Category;
  assignedTo: string; // Developer ID
  factors: EstimateFactors;
  notes: EstimateFactorNotes;
  rawScore: number;
  fibonacciEstimate: number;
};

type Developer = {
  id: string;
  name: string;
  role: Category;
  capacity: number; // points per day
};

type Epic = {
  name: string;
  tasks: Task[];
  developers: Developer[];
  totalPoints: number;
  estimatedDays: number;
  estimatedDeliveryDate: Date;
  parallelEstimate: {
    totalDays: number;
    deliveryDate: Date;
    breakdown: Record<string, { name: string; days: number; points: number }>;
  };
};

const WEIGHTS: Record<keyof EstimateFactors, number> = {
  uncertainty: 0.8, // Reduced from 1.8
  complexity: 0.6, // Reduced from 1.2
  testability: 0.4, // Reduced from 1.2
  legacyImpact: 0.5, // Reduced from 1.2
  integrationDifficulty: 0.7, // Reduced from 1.5
  refactorEffort: 0.4, // Reduced from 1.2
  dependencies: 0.5, // Reduced from 1.2
  requirementVolatility: 0.4, // Reduced from 1.2
};

const FACTOR_DESCRIPTIONS: Record<
  keyof EstimateFactors,
  {
    meaning: string;
    examples: { low: string[]; high: string[] };
  }
> = {
  uncertainty: {
    meaning:
      "How much we DON'T know about the business logic, requirements, or domain",
    examples: {
      low: [
        "We know exactly what needs to be done",
        "Clear, well-defined requirements",
        "Familiar business domain",
      ],
      high: [
        "We have little to no clarity",
        "Major unknowns about requirements",
        "Unfamiliar business domain",
      ],
    },
  },
  complexity: {
    meaning: "Technical difficulty of implementing the feature",
    examples: {
      low: [
        "Simple logic or UI tweak",
        "Basic CRUD operations",
        "Standard patterns",
      ],
      high: ["Many moving parts", "Complex algorithms", "Architectural impact"],
    },
  },
  testability: {
    meaning: "How hard it is to test (manual + automated)",
    examples: {
      low: ["Easy to automate", "Simple validation", "Clear test scenarios"],
      high: [
        "Requires complex setups",
        "Hard to replicate bugs",
        "Long manual testing cycles",
      ],
    },
  },
  legacyImpact: {
    meaning: "How much legacy code we need to touch and how risky that is",
    examples: {
      low: [
        "Isolated from legacy code",
        "New, clean implementation",
        "Well-documented existing code",
      ],
      high: [
        "Deeply tied to fragile code",
        "Poorly documented legacy",
        "High risk of breaking changes",
      ],
    },
  },
  integrationDifficulty: {
    meaning:
      "Technical difficulty of connecting to other systems (internal or external)",
    examples: {
      low: [
        "Well-documented, stable API",
        "Familiar patterns",
        "Simple data mapping",
      ],
      high: [
        "Unstable/undocumented systems",
        "Complex authentication",
        "Data mapping issues",
      ],
    },
  },
  refactorEffort: {
    meaning:
      "How much refactoring is needed/opportunistic to do alongside this work",
    examples: {
      low: [
        "No refactor needed",
        "Clean, maintainable code",
        "Minimal changes required",
      ],
      high: [
        "Large, structural refactor",
        "Technical debt cleanup",
        "Major code reorganization",
      ],
    },
  },
  dependencies: {
    meaning: "How much we rely on other teams or tasks before we can finish",
    examples: {
      low: [
        "No blocking dependencies",
        "Self-contained work",
        "Clear handoff points",
      ],
      high: [
        "Multiple critical dependencies",
        "High coordination risk",
        "Waiting on external teams",
      ],
    },
  },
  requirementVolatility: {
    meaning: "Likelihood that requirements will change mid-work",
    examples: {
      low: ["Frozen requirements", "Stable scope", "Clear acceptance criteria"],
      high: [
        "High chance of shifting goals",
        "Scope creep likely",
        "Requirements still being defined",
      ],
    },
  },
};

function roundUpToFib(n: number): number {
  for (const f of FIB_NUMS) {
    if (n <= f) return f;
  }
  // Since we're capping at 8, anything above 8 should return 8
  return 8;
}

function estimate(factors: EstimateFactors) {
  const rawScore = (
    Object.entries(factors) as [keyof EstimateFactors, number][]
  ).reduce((sum, [key, value]) => sum + value * WEIGHTS[key], 0);
  return {
    rawScore,
    fibonacciEstimate: roundUpToFib(rawScore),
  };
}

function fibonacciToDays(fib: number): string {
  switch (fib) {
    case 0:
      return "0 – VERY QUICK TO DELIVER AND NO COMPLEXITY; ON THE ORDER OF MINUTES";
    case 1:
      return "1 – QUICK TO DELIVER AND MINIMAL COMPLEXITY; ON THE ORDER OF AN HOUR OR SO";
    case 2:
      return "2 – QUICK TO DELIVER AND SOME COMPLEXITY; ON THE ORDER OF MULTIPLE HOURS/HALF-DAY+";
    case 3:
      return "3 – MODERATE TIME TO DELIVER, MODERATE COMPLEXITY, AND POSSIBLY SOME UNCERTAINTY/UNKNOWNS";
    case 5:
      return "5 – LONGER TIME TO DELIVER, HIGH COMPLEXITY, AND LIKELY UNKNOWNS";
    case 8:
      return "8 – LONG TIME TO DELIVER, HIGH COMPLEXITY, CRITICAL UNKNOWNS";
    default:
      return `Unknown Fibonacci number: ${fib}`;
  }
}

function calculateEpicEstimate(tasks: Task[]): {
  totalPoints: number;
  estimatedDays: number;
  estimatedDeliveryDate: Date;
} {
  const totalPoints = tasks.reduce(
    (sum, task) => sum + task.fibonacciEstimate,
    0
  );

  // Convert points to days (rough estimation)
  // 1 point = 1 day, 2 points = 1 day, 3 points = 1.5 days, 5 points = 2.5 days, 8 points = 5 days
  const pointToDaysMap: Record<number, number> = {
    1: 1,
    2: 1,
    3: 1.5,
    5: 2.5,
    8: 5,
  };

  const estimatedDays = tasks.reduce((sum, task) => {
    return sum + (pointToDaysMap[task.fibonacciEstimate] || 0);
  }, 0);

  const today = new Date();
  const estimatedDeliveryDate = new Date(today);
  estimatedDeliveryDate.setDate(today.getDate() + Math.ceil(estimatedDays));

  return { totalPoints, estimatedDays, estimatedDeliveryDate };
}

async function addDevelopers(): Promise<Developer[]> {
  const developers: Developer[] = [];
  let addingDevs = true;

  console.log("\n=== Team Setup ===");
  console.log("Each developer can handle approximately 4 points per day");

  while (addingDevs) {
    const devName = await input({
      message: `Developer ${developers.length + 1} name:`,
    });

    const devRole = await select<Category>({
      message: `Role for ${devName}:`,
      choices: [
        { name: "Backend", value: "Backend" },
        { name: "Frontend", value: "Frontend" },
        { name: "Design", value: "Design" },
      ],
    });

    const capacity = await input({
      message: `Daily capacity for ${devName} (points per day, default: 4):`,
      default: "4",
    });

    const capacityNum = parseFloat(capacity) || 4;

    developers.push({
      id: `dev-${developers.length + 1}`,
      name: devName,
      role: devRole,
      capacity: capacityNum,
    });

    addingDevs = await confirm({ message: "Add another developer?" });
  }

  return developers;
}

function calculateParallelEstimate(
  tasks: Task[],
  developers: Developer[]
): Epic["parallelEstimate"] {
  // Group tasks by assigned developer
  const tasksByDev = tasks.reduce((acc, task) => {
    if (!acc[task.assignedTo]) acc[task.assignedTo] = [];
    acc[task.assignedTo]!.push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Calculate days needed per developer
  const devEstimates: Record<
    string,
    { name: string; days: number; points: number }
  > = {};
  let maxDays = 0;

  Object.entries(tasksByDev).forEach(([devId, devTasks]) => {
    const dev = developers.find((d) => d.id === devId);
    if (!dev) return;

    const totalPoints = devTasks.reduce(
      (sum, task) => sum + task.fibonacciEstimate,
      0
    );
    const days = Math.ceil(totalPoints / dev.capacity);

    devEstimates[devId] = {
      name: dev.name,
      days,
      points: totalPoints,
    };

    maxDays = Math.max(maxDays, days);
  });

  const today = new Date();
  const deliveryDate = new Date(today);
  deliveryDate.setDate(today.getDate() + maxDays);

  return {
    totalDays: maxDays,
    deliveryDate,
    breakdown: devEstimates,
  };
}

async function createTask(developers: Developer[]): Promise<Task> {
  console.log("\n=== Creating New Task ===");

  const name = await input({ message: "Task name:" });

  const category = await select<Category>({
    message: "Choose category:",
    choices: [
      { name: "Backend", value: "Backend" },
      { name: "Frontend", value: "Frontend" },
      { name: "Design", value: "Design" },
    ],
  });

  // Filter developers by category and let user choose
  const availableDevs = developers.filter((d) => d.role === category);
  if (availableDevs.length === 0) {
    console.log(
      `⚠️  No ${category} developers available. Please add a ${category} developer first.`
    );
    throw new Error(`No ${category} developers available`);
  }

  const assignedTo = await select<string>({
    message: `Assign to which ${category} developer?`,
    choices: availableDevs.map((dev) => ({
      name: `${dev.name} (${dev.capacity} pts/day)`,
      value: dev.id,
    })),
  });

  const factors: Partial<EstimateFactors> = {};
  const notes: Partial<EstimateFactorNotes> = {};

  for (const key of Object.keys(WEIGHTS) as (keyof EstimateFactors)[]) {
    const description = FACTOR_DESCRIPTIONS[key];

    console.log(`\n--- ${key.charAt(0).toUpperCase() + key.slice(1)} ---\n`);
    console.log(`Meaning: ${description.meaning}\n`);
    console.log(`0 (Low/Easy): ${description.examples.low.join(", ")}\n`);
    console.log(`3 (High/Hard): ${description.examples.high.join(", ")}\n`);

    let validInput = false;
    let value = 0;

    while (!validInput) {
      try {
        const inputVal = await input({
          message: `${key} (0–3, default: 0):`,
          default: "0",
        });

        if (inputVal.trim() === "") {
          value = 0;
          validInput = true;
        } else {
          const parsed = parseFloat(inputVal);

          if (isNaN(parsed)) {
            console.log("❌ Please enter a valid number (0, 1, 2, or 3)");
            continue;
          }

          if (parsed < 0 || parsed > 3) {
            console.log("❌ Value must be between 0 and 3");
            continue;
          }

          if (!Number.isInteger(parsed)) {
            console.log("❌ Please enter a whole number (0, 1, 2, or 3)");
            continue;
          }

          value = parsed;
          validInput = true;
        }
      } catch (error) {
        console.log("❌ Input error. Please try again.");
        continue;
      }
    }

    factors[key] = value;

    // Add optional note for this factor
    if (value > 0) {
      const note = await input({
        message: `Add note for ${key} (optional, press Enter to skip):`,
        default: "",
      });
      notes[key] = note.trim() || "";
    } else {
      notes[key] = "";
    }
  }

  const result = estimate(factors as EstimateFactors);

  return {
    name,
    category,
    assignedTo,
    factors: factors as EstimateFactors,
    notes: notes as EstimateFactorNotes,
    rawScore: result.rawScore,
    fibonacciEstimate: result.fibonacciEstimate,
  };
}

async function saveEpicToFile(epic: Epic): Promise<void> {
  try {
    // Create estimations folder if it doesn't exist
    const estimationsDir = join(process.cwd(), "estimations");
    await mkdir(estimationsDir, { recursive: true });

    // Generate filename with epic name, date, and timestamp
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    const timeStr =
      today.toTimeString().split(" ")[0]?.replace(/:/g, "-") ?? "00-00-00"; // HH-MM-SS format
    const safeEpicName = epic.name
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const filename = `${safeEpicName}-${dateStr}-${timeStr}.json`;
    const filepath = join(estimationsDir, filename);

    // Prepare data for saving (exclude functions and add metadata)
    const epicData = {
      ...epic,
      createdAt: today.toISOString(),
      version: "1.0",
      metadata: {
        tool: "Epic Estimation Tool",
        generatedAt: today.toISOString(),
        totalTasks: epic.tasks.length,
        totalPoints: epic.totalPoints,
        estimatedDays: epic.estimatedDays,
        estimatedDeliveryDate: epic.estimatedDeliveryDate.toISOString(),
      },
    };

    // Save to file
    await writeFile(filepath, JSON.stringify(epicData, null, 2), "utf-8");

    console.log(`\n💾 Epic saved to: ${filepath}`);
  } catch (error) {
    console.error("\n❌ Failed to save epic:", error);
    console.log("Continuing without saving...");
  }
}

async function main() {
  // Set up graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n👋 Goodbye! Thanks for using the estimation tool.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n👋 Goodbye! Thanks for using the estimation tool.");
    process.exit(0);
  });

  try {
    console.log("=== Epic Estimation ===");
    console.log("Press Ctrl+C at any time to exit\n");

    const epicName = await input({ message: "Epic name:" });

    // Add team setup
    const developers = await addDevelopers();

    const epic: Epic = {
      name: epicName,
      tasks: [],
      developers,
      totalPoints: 0,
      estimatedDays: 0,
      estimatedDeliveryDate: new Date(),
      parallelEstimate: {
        totalDays: 0,
        deliveryDate: new Date(),
        breakdown: {} as Record<
          string,
          { name: string; days: number; points: number }
        >,
      },
    };

    let addingTasks = true;
    while (addingTasks) {
      const task = await createTask(epic.developers);
      epic.tasks.push(task);

      console.log(`\n--- Task Added ---`);
      console.log(`Task: ${task.name}`);
      console.log(`Category: ${task.category}`);
      console.log(
        `Assigned To: ${developers.find((d) => d.id === task.assignedTo)?.name}`
      );
      console.log(`Raw Score: ${task.rawScore.toFixed(1)}`);
      console.log(`Fibonacci Estimate: ${task.fibonacciEstimate}`);
      console.log(`Time Estimate: ${fibonacciToDays(task.fibonacciEstimate)}`);

      addingTasks = await confirm({ message: "Add another task?" });
    }

    // Calculate both sequential and parallel estimates
    const epicEstimate = calculateEpicEstimate(epic.tasks);
    epic.totalPoints = epicEstimate.totalPoints;
    epic.estimatedDays = epicEstimate.estimatedDays;
    epic.estimatedDeliveryDate = epicEstimate.estimatedDeliveryDate;

    // Calculate parallel estimate
    epic.parallelEstimate = calculateParallelEstimate(
      epic.tasks,
      epic.developers
    );

    // Display epic summary with both estimates
    console.log("\n=== Epic Summary ===");
    console.log(`Epic: ${epic.name}`);
    console.log(`Total Tasks: ${epic.tasks.length}`);
    console.log(`Total Points: ${epic.totalPoints}`);

    console.log(
      `\n--- Parallel Estimate (${epic.developers.length} Developers) ---`
    );
    console.log(`Estimated Days: ${epic.parallelEstimate.totalDays}`);
    console.log(
      `Estimated Delivery Date: ${epic.parallelEstimate.deliveryDate.toLocaleDateString()}`
    );

    console.log("\n--- Team Breakdown ---");
    Object.entries(epic.parallelEstimate.breakdown).forEach(([devId, info]) => {
      console.log(`${info.name}: ${info.points} points, ${info.days} day(s)`);
    });

    console.log("\n=== Task Breakdown ===");
    epic.tasks.forEach((task, index) => {
      console.log(
        `${index + 1}. ${task.name} (${task.category}): ${
          task.fibonacciEstimate
        } points`
      );

      // Show notes for factors with scores > 0
      const notesWithScores = Object.entries(task.notes)
        .filter(
          ([factor, note]) =>
            note && task.factors[factor as keyof EstimateFactors] > 0
        )
        .map(([factor, note]) => `  - ${factor}: ${note}`)
        .join("\n");

      if (notesWithScores) {
        console.log(notesWithScores);
      }
    });

    console.log("\n✅ Epic estimation complete!");

    // Save epic to file
    await saveEpicToFile(epic);
  } catch (error) {
    if (error instanceof Error && error.message.includes("User force closed")) {
      console.log("\n👋 Goodbye! Thanks for using the estimation tool.");
      process.exit(0);
    }
    console.error("\n❌ An error occurred:", error);
    process.exit(1);
  }
}

main();

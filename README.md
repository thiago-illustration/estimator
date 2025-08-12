# Epic Estimation Tool

A powerful CLI tool for estimating software development epics using Fibonacci story points and parallel development calculations.

## Features

- **Epic Management**: Create and manage development epics with multiple tasks
- **Smart Estimation**: Use 8-factor analysis (uncertainty, complexity, testability, etc.)
- **Team Planning**: Assign tasks to developers and calculate parallel delivery times
- **Fibonacci Points**: Automatic conversion to Fibonacci story points (1, 2, 3, 5, 8)
- **Notes & Context**: Add detailed notes for high-scoring factors to track concerns
- **Export**: Save estimations to JSON files with timestamps
- **Parallel Estimates**: Calculate realistic delivery times with multiple developers

## ⚙️ Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- TypeScript support

## ️ Installation

```bash
# Clone the repository
git clone https://github.com/thiago-illustration/estimator.git
cd estimation

# Install dependencies
bun install

# Run the tool
bun index.ts
```

## 📖 Usage

### 1. Create an Epic

- Enter the epic name
- Set up your development team with roles and capacities

### 2. Add Team Members

- Specify developer names, roles (Backend/Frontend/Design), and daily capacity
- Default capacity is 4 points per day

### 3. Create Tasks

- Add task names and categories
- Assign tasks to appropriate developers
- Rate each task on 8 factors (0-3 scale):
  - **Uncertainty**: How much you don't know about requirements
  - **Complexity**: Technical difficulty
  - **Testability**: How hard it is to test
  - **Legacy Impact**: Risk of touching legacy code
  - **Integration Difficulty**: Connecting to other systems
  - **Refactor Effort**: Code restructuring needed
  - **Dependencies**: Blocking external factors
  - **Requirement Volatility**: Likelihood of scope changes

### 4. Add Context

- For high-scoring factors, add notes explaining concerns
- These notes help track what needs to be resolved

### 5. Get Estimates

- **Sequential Estimate**: Single developer timeline
- **Parallel Estimate**: Team timeline with parallel development
- **Team Breakdown**: Per-developer workload and timeline

## 📊 Output Example

```bash
=== Epic Summary ===
Epic: User Authentication System
Total Tasks: 5
Total Points: 18

--- Parallel Estimate (3 Developers) ---
Estimated Days: 4
Estimated Delivery Date: 8/16/2025

--- Team Breakdown ---
Alice: 8 points, 2 day(s)
Bob: 5 points, 2 day(s)
Carol: 5 points, 2 day(s)

=== Task Breakdown ===
Login API (Backend - Alice): 5 points
complexity: Need to implement OAuth2
testability: Requires mock auth server
Login UI (Frontend - Bob): 3 points
```

## 📄 Data Export

Estimations are automatically saved to the `estimations/` folder with:

- Epic name
- Timestamp
- All task details and notes
- Team assignments and estimates

### Example Generated File

```json
{
  "name": "User Authentication System",
  "tasks": [
    {
      "name": "Login API",
      "category": "Backend",
      "assignedTo": "dev-1",
      "factors": {
        "uncertainty": 1,
        "complexity": 2,
        "testability": 1,
        "legacyImpact": 0,
        "integrationDifficulty": 0,
        "refactorEffort": 0,
        "dependencies": 0,
        "requirementVolatility": 0
      },
      "notes": {
        "uncertainty": "Need to clarify OAuth2 requirements",
        "complexity": "Implementing JWT tokens",
        "testability": "Requires mock auth server setup",
        "legacyImpact": "",
        "integrationDifficulty": "",
        "refactorEffort": "",
        "dependencies": "",
        "requirementVolatility": ""
      },
      "rawScore": 2.4,
      "fibonacciEstimate": 3
    }
  ],
  "developers": [
    {
      "id": "dev-1",
      "name": "Alice",
      "role": "Backend",
      "capacity": 4
    }
  ],
  "totalPoints": 3,
  "estimatedDays": 1.5,
  "estimatedDeliveryDate": "2025-08-13T00:00:00.000Z",
  "parallelEstimate": {
    "totalDays": 1,
    "deliveryDate": "2025-08-13T00:00:00.000Z",
    "breakdown": {
      "dev-1": {
        "name": "Alice",
        "days": 1,
        "points": 3
      }
    }
  },
  "createdAt": "2025-08-12T16:58:13.000Z",
  "version": "1.0",
  "metadata": {
    "tool": "Epic Estimation Tool",
    "generatedAt": "2025-08-12T16:58:13.000Z",
    "totalTasks": 1,
    "totalPoints": 3,
    "estimatedDays": 1.5,
    "estimatedDeliveryDate": "2025-08-12T16:58:13.000Z"
  }
}
```

The file is named with the pattern: `epic-name-YYYY-MM-DD-HH-MM-SS.json`

## ⚙️ Configuration

### Weights

The tool uses weighted factors for more accurate estimates:

- Uncertainty: 0.8x
- Complexity: 0.6x
- Testability: 0.4x
- Legacy Impact: 0.5x
- Integration Difficulty: 0.7x
- Refactor Effort: 0.4x
- Dependencies: 0.5x
- Requirement Volatility: 0.4x

### Fibonacci Scale

- 1 point: ~1 hour (simple changes)
- 2 points: ~2-4 hours (moderate complexity)
- 3 points: ~1 day (moderate complexity + unknowns)
- 5 points: ~2-3 days (high complexity)
- 8 points: ~1 week (very high complexity + unknowns)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

For questions or issues:

- Create an issue in the repository
- Contact the development team
- Check the saved estimation files for reference

## 🔄 Updates

To update the tool:

```bash
git pull origin main
bun install
```

---

**Happy Estimating! 🎯**

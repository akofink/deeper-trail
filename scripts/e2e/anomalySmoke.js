import { runObjectiveLoopSmoke, resolveObjectiveLoopSmoke } from "./fullObjectiveLoop.js";

runObjectiveLoopSmoke(resolveObjectiveLoopSmoke("anomaly")).catch((error) => {
  console.error(error);
  process.exit(1);
});

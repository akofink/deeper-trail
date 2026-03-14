import { runObjectiveLoopSmoke, resolveObjectiveLoopSmoke } from "./fullObjectiveLoop.js";

runObjectiveLoopSmoke(resolveObjectiveLoopSmoke("ruin")).catch((error) => {
  console.error(error);
  process.exit(1);
});

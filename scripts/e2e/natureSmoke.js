import { runObjectiveLoopSmoke, resolveObjectiveLoopSmoke } from "./fullObjectiveLoop.js";

runObjectiveLoopSmoke(resolveObjectiveLoopSmoke("nature")).catch((error) => {
  console.error(error);
  process.exit(1);
});

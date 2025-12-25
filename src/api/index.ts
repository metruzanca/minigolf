import { action, query } from "@solidjs/router";
import {
  getUser as gU,
  logout as l,
  loginOrRegister as lOR,
  createGame as cG,
  getGame as gG,
  addPlayer as aP,
  addScore as aS,
  updateCurrentHole as uCH,
  getAverageScoreForHole as gASFH,
  addHole as aH,
  updatePlayer as uP,
} from "./server";

export const getUser = query(gU, "user");
export const loginOrRegister = action(lOR, "loginOrRegister");
export const logout = action(l, "logout");
export const createGame = action(cG, "createGame");
export const getGame = query(gG, "getGame");
export const addPlayer = action(aP, "addPlayer");
export const addScore = action(aS, "addScore");
export const updateCurrentHole = action(uCH, "updateCurrentHole");
export const getAverageScoreForHole = query(gASFH, "getAverageScoreForHole");
export const addHole = action(aH, "addHole");
export const updatePlayer = action(uP, "updatePlayer");

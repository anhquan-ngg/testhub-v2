"use client";

import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import userReducer from "./slices/userSlice";
import examReducer from "./slices/examSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    exam: examReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export function ReduxProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

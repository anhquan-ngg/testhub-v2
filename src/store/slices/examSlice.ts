import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ExamState {
  testStarted: boolean;
}

const initialState: ExamState = {
  testStarted: false,
};

export const examSlice = createSlice({
  name: "exam",
  initialState,
  reducers: {
    setTestStarted: (state, action: PayloadAction<boolean>) => {
      state.testStarted = action.payload;
    },
    startTest: (state) => {
      state.testStarted = true;
    },
    endTest: (state) => {
      state.testStarted = false;
    },
  },
});

export const { setTestStarted, startTest, endTest } = examSlice.actions;
export default examSlice.reducer;
